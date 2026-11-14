use super::{domain::*, error::*};
use rusqlite::{Connection as Sqlite, Row, params};
use std::collections::HashSet;

/// Shared aggregate behavior, composed with a closed collection/thread selector.
/// Each aggregate owns metadata and membership revision; notes remain independent.
pub struct GroupRepository<'a> {
    db: &'a Sqlite,
    kind: GroupKind,
}
impl<'a> GroupRepository<'a> {
    pub fn new(db: &'a Sqlite, kind: GroupKind) -> Self {
        Self { db, kind }
    }
    pub fn get(&self, id: &Id) -> Result<Group> {
        Ok(self.db.query_row(
            &format!("SELECT * FROM {} WHERE id=?1", self.kind.table()),
            [id],
            Self::row,
        )?)
    }
    pub fn list(&self) -> Result<Vec<Group>> {
        self.db
            .prepare(&format!(
                "SELECT * FROM {} ORDER BY created_at, id",
                self.kind.table()
            ))?
            .query_map([], Self::row)?
            .map(|r| r.map_err(Into::into))
            .collect()
    }
    pub fn create(&self, input: GroupInput) -> Result<Group> {
        input.validate()?;
        let id = Id::new();
        self.db.execute(
            &format!(
                "INSERT INTO {} VALUES (?1, ?2, ?3, ?4, ?4, 1)",
                self.kind.table()
            ),
            params![id, input.name, input.description, now()?],
        )?;
        self.get(&id)
    }
    pub fn update(&self, id: &Id, revision: i64, input: GroupInput) -> Result<Group> {
        input.validate()?;
        self.check_revision(id, revision)?;
        self.db.execute(
            &format!(
                "UPDATE {} SET name=?2, description=?3,
            updated_at=max(updated_at, ?4), revision=revision+1 WHERE id=?1",
                self.kind.table()
            ),
            params![id, input.name, input.description, now()?],
        )?;
        self.get(id)
    }
    pub fn delete(&self, id: &Id, revision: i64) -> Result<()> {
        self.check_revision(id, revision)?;
        self.db.execute(
            &format!("DELETE FROM {} WHERE id=?1", self.kind.table()),
            [id],
        )?;
        Ok(())
    }
    pub fn members(&self, id: &Id) -> Result<Members> {
        let group = self.get(id)?;
        let members = self
            .db
            .prepare(&format!(
                "SELECT note_id, position FROM {} WHERE group_id=?1 ORDER BY position",
                self.kind.members()
            ))?
            .query_map([id], |r| {
                Ok(Membership {
                    note_id: r.get(0)?,
                    position: r.get(1)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(Members { group, members })
    }
    /// Atomic membership CRUD: the complete ordered ID list adds, reorders and
    /// removes memberships in one commit. An empty list clears only memberships.
    /// The transaction rolls back the deletion if any FK/insert fails afterwards.
    pub fn set_members(&self, id: &Id, revision: i64, note_ids: Vec<Id>) -> Result<Members> {
        self.check_revision(id, revision)?;
        if note_ids.len() > 10000 || note_ids.iter().collect::<HashSet<_>>().len() != note_ids.len()
        {
            return Err(StoreError::InvalidInput);
        }
        self.db.execute(
            &format!("DELETE FROM {} WHERE group_id=?1", self.kind.members()),
            [id],
        )?;
        let mut insert = self.db.prepare(&format!(
            "INSERT INTO {} (group_id, note_id, position) VALUES (?1, ?2, ?3)",
            self.kind.members()
        ))?;
        for (position, note_id) in note_ids.iter().enumerate() {
            insert.execute(params![id, note_id, position as i64])?;
        }
        self.db.execute(
            &format!(
                "UPDATE {} SET revision=revision+1,
            updated_at=max(updated_at, ?2) WHERE id=?1",
                self.kind.table()
            ),
            params![id, now()?],
        )?;
        self.members(id)
    }
    fn check_revision(&self, id: &Id, revision: i64) -> Result<()> {
        if self.get(id)?.revision != revision {
            return Err(StoreError::Conflict);
        }
        Ok(())
    }
    fn row(row: &Row<'_>) -> rusqlite::Result<Group> {
        Ok(Group {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
            revision: row.get("revision")?,
        })
    }
}
