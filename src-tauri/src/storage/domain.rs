use super::error::{Result, StoreError};
use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ToSql, ToSqlOutput, ValueRef};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::{SystemTime, UNIX_EPOCH};

/// Opaque canonical UUID shared by the wire and SQLite. Entity tables determine
/// its namespace; TypeScript brands distinguish note/connection/group callers.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub struct Id(String);

impl Id {
    pub fn new() -> Self {
        Self(uuid::Uuid::new_v4().to_string())
    }
}

impl TryFrom<String> for Id {
    type Error = &'static str;
    fn try_from(value: String) -> std::result::Result<Self, Self::Error> {
        let parsed = uuid::Uuid::parse_str(&value).map_err(|_| "invalid ID")?;
        if parsed.is_nil() || parsed.to_string() != value {
            return Err("invalid ID");
        }
        Ok(Self(value))
    }
}
impl From<Id> for String {
    fn from(id: Id) -> String {
        id.0
    }
}
impl ToSql for Id {
    fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
        self.0.to_sql()
    }
}
impl FromSql for Id {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        Self::try_from(value.as_str()?.to_owned()).map_err(|_| FromSqlError::InvalidType)
    }
}

/// Epoch milliseconds fit exactly in JavaScript numbers. Timestamps and IDs are
/// generated natively; callers cannot fabricate creation or save acknowledgements.
pub fn now() -> Result<i64> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| StoreError::Internal)?
        .as_millis();
    i64::try_from(millis).map_err(|_| StoreError::Internal)
}

pub fn text(value: &str, max: usize, allow_empty: bool) -> Result<()> {
    if value.len() > max || value.contains('\0') || (!allow_empty && value.trim().is_empty()) {
        return Err(StoreError::InvalidInput);
    }
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct NoteInput {
    pub title: String,
    /// Versioned editor envelope; storage preserves unknown editor attributes.
    /// The editor feature will validate its own complete ProseMirror schema.
    pub body: Value,
    pub is_favorite: bool,
    pub is_archived: bool,
    pub is_deleted: bool,
}

impl NoteInput {
    pub fn validate(&self) -> Result<()> {
        text(&self.title, 4096, true)?;
        if self.body.get("version").and_then(Value::as_u64) != Some(1)
            || self
                .body
                .get("document")
                .and_then(|d| d.get("type"))
                .and_then(Value::as_str)
                != Some("doc")
            || self.body.to_string().len() > 10 * 1024 * 1024
        {
            return Err(StoreError::InvalidInput);
        }
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Note {
    pub id: Id,
    pub title: String,
    pub body: Value,
    pub is_favorite: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub archived_at: Option<i64>,
    pub deleted_at: Option<i64>,
    /// Compare-and-swap revision prevents a stale editor from overwriting data.
    pub revision: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct GroupInput {
    pub name: String,
    pub description: String,
}
impl GroupInput {
    pub fn validate(&self) -> Result<()> {
        text(&self.name, 4096, false)?;
        text(&self.description, 65536, true)
    }
}

/// Only these closed variants may select SQL identifiers; IPC never supplies SQL.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GroupKind {
    Collection,
    Thread,
}
impl GroupKind {
    pub fn table(self) -> &'static str {
        match self {
            Self::Collection => "collection",
            Self::Thread => "thread",
        }
    }
    pub fn members(self) -> &'static str {
        match self {
            Self::Collection => "collection_note",
            Self::Thread => "thread_note",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Group {
    pub id: Id,
    pub name: String,
    pub description: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub revision: i64,
}

/// Membership identity is (group ID, note ID), not a third independent UUID.
/// Positions are unique and ordered, but may have gaps after a note is purged.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Membership {
    pub note_id: Id,
    pub position: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Members {
    pub group: Group,
    pub members: Vec<Membership>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionKind {
    Related,
    Supports,
    Contradicts,
    References,
}
impl ConnectionKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Related => "related",
            Self::Supports => "supports",
            Self::Contradicts => "contradicts",
            Self::References => "references",
        }
    }
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Direction {
    Directed,
    Undirected,
}
impl Direction {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Directed => "directed",
            Self::Undirected => "undirected",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ConnectionInput {
    pub source_note_id: Id,
    pub target_note_id: Id,
    pub kind: ConnectionKind,
    pub direction: Direction,
    pub strength: f64,
}
impl ConnectionInput {
    pub fn canonicalize(mut self) -> Result<Self> {
        if self.source_note_id == self.target_note_id
            || !self.strength.is_finite()
            || !(0.0..=1.0).contains(&self.strength)
        {
            return Err(StoreError::InvalidInput);
        }
        // Undirected A–B and B–A have one identity; directed reverse edges differ.
        if self.direction == Direction::Undirected && self.source_note_id.0 > self.target_note_id.0
        {
            std::mem::swap(&mut self.source_note_id, &mut self.target_note_id);
        }
        Ok(self)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Connection {
    pub id: Id,
    #[serde(flatten)]
    pub input: ConnectionInput,
    pub created_at: i64,
    pub updated_at: i64,
    pub revision: i64,
}
