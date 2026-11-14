use serde::Serialize;

pub type Result<T> = std::result::Result<T, StoreError>;

/// Stable wire codes let features choose recovery without parsing SQLite text.
/// Never return SQL, document contents, or local filesystem paths over IPC.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum StoreError {
    InvalidInput,
    NotFound,
    Conflict,
    Busy,
    Unavailable,
    IncompatibleSchema,
    CorruptDatabase,
    Internal,
}

impl From<rusqlite::Error> for StoreError {
    fn from(error: rusqlite::Error) -> Self {
        use rusqlite::{Error, ErrorCode};
        match error {
            Error::QueryReturnedNoRows => Self::NotFound,
            Error::SqliteFailure(code, _) => match code.code {
                ErrorCode::DatabaseBusy | ErrorCode::DatabaseLocked => Self::Busy,
                ErrorCode::ConstraintViolation => Self::Conflict,
                ErrorCode::DatabaseCorrupt | ErrorCode::NotADatabase => Self::CorruptDatabase,
                ErrorCode::CannotOpen
                | ErrorCode::ReadOnly
                | ErrorCode::DiskFull
                | ErrorCode::SystemIoFailure
                | ErrorCode::PermissionDenied => Self::Unavailable,
                _ => Self::Internal,
            },
            Error::FromSqlConversionFailure(..) | Error::InvalidColumnType(..) => {
                Self::CorruptDatabase
            }
            _ => Self::Internal,
        }
    }
}
