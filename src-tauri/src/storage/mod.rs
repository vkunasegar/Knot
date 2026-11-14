mod connections;
mod database;
mod domain;
mod error;
mod groups;
mod migrations;
mod notes;
mod request;

use database::Database;
use error::{Result, StoreError};
use request::Request;
use serde_json::Value;
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};

/// Application-owned service. The injected native path is never accepted from
/// JavaScript. Lazy open lets the shell survive an unavailable database; a later
/// explicit call retries initialization without replacing or truncating the file.
pub struct StoreService {
    path: Result<PathBuf>,
    database: Mutex<Option<Database>>,
}
impl StoreService {
    pub fn new(directory: std::result::Result<PathBuf, tauri::Error>) -> Self {
        Self::at_path(
            directory
                .map(|path| path.join("knot.sqlite3"))
                .map_err(|_| StoreError::Unavailable),
        )
    }
    fn at_path(path: Result<PathBuf>) -> Self {
        Self {
            path,
            database: Mutex::new(None),
        }
    }

    fn execute(&self, request: Request) -> Result<Value> {
        let mut slot = self.database.lock().map_err(|_| StoreError::Internal)?;
        if slot.is_none() {
            let path = self.path.as_ref().map_err(Clone::clone)?;
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent).map_err(|_| StoreError::Unavailable)?;
            }
            *slot = Some(Database::open(path)?);
        }
        slot.as_mut().ok_or(StoreError::Internal)?.execute(request)
    }
}

/// Blocking SQL runs off the UI thread. Parsing at this boundary ensures malformed
/// requests receive the same stable error contract as repository validation errors.
#[tauri::command]
pub async fn store_execute(
    service: tauri::State<'_, Arc<StoreService>>,
    request: Value,
) -> Result<Value> {
    let request: Request = serde_json::from_value(request).map_err(|_| StoreError::InvalidInput)?;
    let service = Arc::clone(service.inner());
    tauri::async_runtime::spawn_blocking(move || service.execute(request))
        .await
        .map_err(|_| StoreError::Internal)?
}

#[cfg(test)]
mod tests;
