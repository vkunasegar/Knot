use super::{domain::*, error::*};
use rusqlite::{Connection as Sqlite, Row, params};

/// Pairwise links have their own lifecycle, independent of ordered thread paths.
pub struct ConnectionRepository<'a> {
    db: &'a Sqlite,
}
impl<'a> ConnectionRepository<'a> {
    pub fn new(db: &'a Sqlite) -> Self {
        Self { db }
    }
    pub fn get(&self, id: &Id) -> Result<Connection> {
        Ok(self
            .db
            .query_row("SELECT * FROM connection WHERE id=?1", [id], Self::row)?)
    }
    pub fn list(&self) -> Result<Vec<Connection>> {
        self.db
            .prepare("SELECT * FROM connection ORDER BY created_at, id")?
            .query_map([], Self::row)?
            .map(|r| r.map_err(Into::into))
            .collect()
    }
    pub fn create(&self, input: ConnectionInput) -> Result<Connection> {
        let input = input.canonicalize()?;
        let id = Id::new();
        self.db.execute(
            "INSERT INTO connection VALUES (?1,?2,?3,?4,?5,?6,?7,?7,1)",
            params![
                id,
                input.source_note_id,
                input.target_note_id,
                input.kind.as_str(),
                input.direction.as_str(),
                input.strength,
                now()?
            ],
        )?;
        self.get(&id)
    }
    pub fn update(&self, id: &Id, revision: i64, input: ConnectionInput) -> Result<Connection> {
        let input = input.canonicalize()?;
        if self.get(id)?.revision != revision {
            return Err(StoreError::Conflict);
        }
        self.db.execute("UPDATE connection SET source_note_id=?2, target_note_id=?3, kind=?4,
            direction=?5, strength=?6, updated_at=max(updated_at, ?7), revision=revision+1 WHERE id=?1",
            params![id, input.source_note_id, input.target_note_id, input.kind.as_str(),
                input.direction.as_str(), input.strength, now()?])?;
        self.get(id)
    }
    pub fn delete(&self, id: &Id, revision: i64) -> Result<()> {
        if self.get(id)?.revision != revision {
            return Err(StoreError::Conflict);
        }
        self.db
            .execute("DELETE FROM connection WHERE id=?1", [id])?;
        Ok(())
    }
    fn row(row: &Row<'_>) -> rusqlite::Result<Connection> {
        let kind: String = row.get("kind")?;
        let direction: String = row.get("direction")?;
        // Do not silently coerce damaged or future enum values to a valid link.
        let parse = |value: String| {
            serde_json::from_value(serde_json::Value::String(value)).map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })
        };
        let kind: ConnectionKind = parse(kind)?;
        let direction: Direction = serde_json::from_value(serde_json::Value::String(direction))
            .map_err(|e| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(e),
                )
            })?;
        Ok(Connection {
            id: row.get("id")?,
            input: ConnectionInput {
                source_note_id: row.get("source_note_id")?,
                target_note_id: row.get("target_note_id")?,
                kind,
                direction,
                strength: row.get("strength")?,
            },
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            revision: row.get("revision")?,
        })
    }
}
