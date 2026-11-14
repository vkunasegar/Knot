use super::{error::*, migrations::MigrationRunner, request::Request};
use rusqlite::{Connection, OpenFlags, TransactionBehavior};
use serde_json::Value;
use std::{path::Path, time::Duration};

/// Owns one SQLite connection for its lifetime. StoreService serializes access;
/// repositories only borrow transactions and cannot outlive this owner.
pub struct Database {
    connection: Connection,
}
impl Database {
    pub fn open(path: &Path) -> Result<Self> {
        let mut connection = Connection::open_with_flags(
            path,
            OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE,
        )?;
        connection.busy_timeout(Duration::from_millis(1500))?;
        connection.pragma_update(None, "foreign_keys", true)?;
        connection.pragma_update(None, "synchronous", "FULL")?;
        MigrationRunner::run(&mut connection)?;
        // FULL sync + WAL commits are acknowledged only after SQLite confirms
        // durability. WAL/SHM sidecars belong to the database, not disposable cache.
        let mode: String = connection.query_row("PRAGMA journal_mode=WAL", [], |r| r.get(0))?;
        if mode != "wal" {
            return Err(StoreError::Unavailable);
        }
        Ok(Self { connection })
    }

    pub fn execute(&mut self, request: Request) -> Result<Value> {
        let behavior = if request.is_read() {
            TransactionBehavior::Deferred
        } else {
            TransactionBehavior::Immediate
        };
        let tx = self.connection.transaction_with_behavior(behavior)?;
        let result = request.execute(&tx)?;
        tx.commit()?;
        // Even serialization must succeed before commit, to avoid a false error
        // after a successful mutation. IPC delivery itself can still be interrupted.
        Ok(result)
    }
}
