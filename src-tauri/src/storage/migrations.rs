use super::error::*;
use rusqlite::{Connection, TransactionBehavior, params};

const APPLICATION_ID: i64 = 0x4b4e4f54; // KNOT, distinct from an unrelated SQLite file.
pub(super) const MIGRATIONS: &[(&str, &str)] =
    &[("domain", include_str!("migrations/001_domain.sql"))];

/// Owns the schema upgrade transaction. Applied SQL is immutable and checked on
/// reopen; a future/modified/foreign schema is refused rather than reset or repaired.
pub struct MigrationRunner;
impl MigrationRunner {
    pub fn run(db: &mut Connection) -> Result<()> {
        Self::apply(db, MIGRATIONS)
    }

    pub(super) fn apply(db: &mut Connection, migrations: &[(&str, &str)]) -> Result<()> {
        // Acquire the writer lock BEFORE reading the version: two app processes
        // starting together must not both conclude that migration 1 is pending.
        let tx = db.transaction_with_behavior(TransactionBehavior::Immediate)?;
        let version: i64 = tx.pragma_query_value(None, "user_version", |r| r.get(0))?;
        let app_id: i64 = tx.pragma_query_value(None, "application_id", |r| r.get(0))?;
        if version < 0
            || version as usize > migrations.len()
            || (app_id != 0 && app_id != APPLICATION_ID)
        {
            return Err(StoreError::IncompatibleSchema);
        }
        if version == 0 {
            let tables: i64 = tx.query_row(
                "SELECT count(*) FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%'",
                [],
                |r| r.get(0),
            )?;
            if tables != 0 {
                return Err(StoreError::IncompatibleSchema);
            }
            tx.execute_batch(
                "CREATE TABLE schema_migration (
                version INTEGER PRIMARY KEY, name TEXT NOT NULL, sql TEXT NOT NULL
            ) STRICT;",
            )?;
            tx.pragma_update(None, "application_id", APPLICATION_ID)?;
        } else if app_id != APPLICATION_ID {
            return Err(StoreError::IncompatibleSchema);
        }

        let history = tx
            .prepare("SELECT version, name, sql FROM schema_migration ORDER BY version")?
            .query_map([], |r| {
                Ok((
                    r.get::<_, i64>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                ))
            })?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|_| StoreError::IncompatibleSchema)?;
        if history.len() != version as usize {
            return Err(StoreError::IncompatibleSchema);
        }
        for (index, (number, name, sql)) in history.iter().enumerate() {
            if *number != (index + 1) as i64 || (name.as_str(), sql.as_str()) != migrations[index] {
                return Err(StoreError::IncompatibleSchema);
            }
        }
        for (index, (name, sql)) in migrations.iter().enumerate().skip(version as usize) {
            tx.execute_batch(sql)?;
            tx.execute(
                "INSERT INTO schema_migration VALUES (?1, ?2, ?3)",
                params![index as i64 + 1, name, sql],
            )?;
            tx.pragma_update(None, "user_version", index as i64 + 1)?;
        }
        // Existing orphaned data is an error, never an excuse to silently delete it.
        if tx
            .prepare("PRAGMA foreign_key_check")?
            .query([])?
            .next()?
            .is_some()
        {
            return Err(StoreError::CorruptDatabase);
        }
        let integrity: String = tx.query_row("PRAGMA quick_check", [], |r| r.get(0))?;
        if integrity != "ok" {
            return Err(StoreError::CorruptDatabase);
        }
        tx.commit()?;
        Ok(())
    }
}
