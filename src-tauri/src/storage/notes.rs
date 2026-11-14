use super::{domain::*, error::*};
use rusqlite::{Connection as Sqlite, Row, params};

/// Borrows the caller's transaction. Only Database owns commit/rollback, so a
/// future compound workflow can compose repositories without partial saves.
pub struct NoteRepository<'a> {
    db: &'a Sqlite,
}
impl<'a> NoteRepository<'a> {
    pub fn new(db: &'a Sqlite) -> Self {
        Self { db }
    }

    pub fn get(&self, id: &Id) -> Result<Note> {
        let note = self
            .db
            .query_row("SELECT * FROM note WHERE id = ?1", [id], Self::row)?;
        Self::validate_stored(note)
    }

    /// Includes archived and trashed records. Workflows explicitly choose their
    /// visibility; storage never silently discards recoverable document data.
    pub fn list(&self) -> Result<Vec<Note>> {
        self.db
            .prepare("SELECT * FROM note ORDER BY updated_at DESC, id")?
            .query_map([], Self::row)?
            .map(|row| Self::validate_stored(row?))
            .collect()
    }

    pub fn create(&self, input: NoteInput) -> Result<Note> {
        input.validate()?;
        let id = Id::new();
        let timestamp = now()?;
        self.db.execute(
            "INSERT INTO note VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?6, ?7, 1)",
            params![
                id,
                input.title,
                input.body.to_string(),
                input.is_favorite,
                timestamp,
                input.is_archived.then_some(timestamp),
                input.is_deleted.then_some(timestamp)
            ],
        )?;
        self.get(&id)
    }

    pub fn update(&self, id: &Id, expected_revision: i64, input: NoteInput) -> Result<Note> {
        input.validate()?;
        let old = self.get(id)?;
        if old.revision != expected_revision {
            return Err(StoreError::Conflict);
        }
        // Wall clocks can move backwards. Revisions, not timestamps, detect edits.
        let timestamp = now()?.max(old.updated_at);
        self.db.execute(
            "UPDATE note SET title=?2, body_json=?3, is_favorite=?4, updated_at=?5,
             archived_at=?6, deleted_at=?7, revision=revision+1 WHERE id=?1",
            params![
                id,
                input.title,
                input.body.to_string(),
                input.is_favorite,
                timestamp,
                input
                    .is_archived
                    .then_some(old.archived_at.unwrap_or(timestamp)),
                input
                    .is_deleted
                    .then_some(old.deleted_at.unwrap_or(timestamp))
            ],
        )?;
        self.get(id)
    }

    /// Physical deletion requires an already trashed note and its current revision.
    /// FK cascades remove links/memberships, never other notes or their containers.
    pub fn purge(&self, id: &Id, expected_revision: i64) -> Result<()> {
        let old = self.get(id)?;
        if old.revision != expected_revision || old.deleted_at.is_none() {
            return Err(StoreError::Conflict);
        }
        // Membership snapshots carry the parent's revision. Bump it before cascade
        // so a stale reorder cannot resurrect a purged member or lose another edit.
        for kind in [GroupKind::Collection, GroupKind::Thread] {
            self.db.execute(
                &format!(
                    "UPDATE {} SET revision=revision+1, updated_at=max(updated_at, ?2)
                 WHERE id IN (SELECT group_id FROM {} WHERE note_id=?1)",
                    kind.table(),
                    kind.members()
                ),
                params![id, now()?],
            )?;
        }
        self.db.execute("DELETE FROM note WHERE id=?1", [id])?;
        Ok(())
    }

    fn row(row: &Row<'_>) -> rusqlite::Result<Note> {
        let body: String = row.get("body_json")?;
        let body = serde_json::from_str(&body).map_err(|e| {
            rusqlite::Error::FromSqlConversionFailure(2, rusqlite::types::Type::Text, Box::new(e))
        })?;
        Ok(Note {
            id: row.get("id")?,
            title: row.get("title")?,
            body,
            is_favorite: row.get("is_favorite")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            archived_at: row.get("archived_at")?,
            deleted_at: row.get("deleted_at")?,
            revision: row.get("revision")?,
        })
    }

    fn validate_stored(note: Note) -> Result<Note> {
        NoteInput {
            title: note.title.clone(),
            body: note.body.clone(),
            is_favorite: note.is_favorite,
            is_archived: note.archived_at.is_some(),
            is_deleted: note.deleted_at.is_some(),
        }
        .validate()
        .map_err(|_| StoreError::CorruptDatabase)?;
        Ok(note)
    }
}
