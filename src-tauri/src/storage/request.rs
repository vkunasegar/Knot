use super::{
    connections::ConnectionRepository, domain::*, error::*, groups::GroupRepository,
    notes::NoteRepository,
};
use rusqlite::Transaction;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Closed IPC protocol. Unknown operations/fields are rejected before touching
/// storage; no command accepts arbitrary SQL, database paths or generated IDs.
#[derive(Debug, Deserialize)]
#[serde(
    tag = "operation",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum Request {
    GetNote {
        id: Id,
    },
    ListNotes {},
    CreateNote {
        input: NoteInput,
    },
    UpdateNote {
        id: Id,
        expected_revision: i64,
        input: NoteInput,
    },
    PurgeNote {
        id: Id,
        expected_revision: i64,
    },
    GetConnection {
        id: Id,
    },
    ListConnections {},
    CreateConnection {
        input: ConnectionInput,
    },
    UpdateConnection {
        id: Id,
        expected_revision: i64,
        input: ConnectionInput,
    },
    DeleteConnection {
        id: Id,
        expected_revision: i64,
    },
    GetGroup {
        kind: GroupKind,
        id: Id,
    },
    ListGroups {
        kind: GroupKind,
    },
    CreateGroup {
        kind: GroupKind,
        input: GroupInput,
    },
    UpdateGroup {
        kind: GroupKind,
        id: Id,
        expected_revision: i64,
        input: GroupInput,
    },
    DeleteGroup {
        kind: GroupKind,
        id: Id,
        expected_revision: i64,
    },
    GetMembers {
        kind: GroupKind,
        id: Id,
    },
    SetMembers {
        kind: GroupKind,
        id: Id,
        expected_revision: i64,
        note_ids: Vec<Id>,
    },
}

impl Request {
    pub fn is_read(&self) -> bool {
        matches!(
            self,
            Self::GetNote { .. }
                | Self::ListNotes { .. }
                | Self::GetConnection { .. }
                | Self::ListConnections { .. }
                | Self::GetGroup { .. }
                | Self::ListGroups { .. }
                | Self::GetMembers { .. }
        )
    }

    /// Dispatch borrows the transaction; repositories cannot acknowledge a commit.
    pub fn execute(self, tx: &Transaction<'_>) -> Result<Value> {
        let notes = NoteRepository::new(tx);
        let connections = ConnectionRepository::new(tx);
        match self {
            Self::GetNote { id } => encode(notes.get(&id)?),
            Self::ListNotes {} => encode(notes.list()?),
            Self::CreateNote { input } => encode(notes.create(input)?),
            Self::UpdateNote {
                id,
                expected_revision,
                input,
            } => encode(notes.update(&id, expected_revision, input)?),
            Self::PurgeNote {
                id,
                expected_revision,
            } => encode(notes.purge(&id, expected_revision)?),
            Self::GetConnection { id } => encode(connections.get(&id)?),
            Self::ListConnections {} => encode(connections.list()?),
            Self::CreateConnection { input } => encode(connections.create(input)?),
            Self::UpdateConnection {
                id,
                expected_revision,
                input,
            } => encode(connections.update(&id, expected_revision, input)?),
            Self::DeleteConnection {
                id,
                expected_revision,
            } => encode(connections.delete(&id, expected_revision)?),
            Self::GetGroup { kind, id } => encode(GroupRepository::new(tx, kind).get(&id)?),
            Self::ListGroups { kind } => encode(GroupRepository::new(tx, kind).list()?),
            Self::CreateGroup { kind, input } => {
                encode(GroupRepository::new(tx, kind).create(input)?)
            }
            Self::UpdateGroup {
                kind,
                id,
                expected_revision,
                input,
            } => encode(GroupRepository::new(tx, kind).update(&id, expected_revision, input)?),
            Self::DeleteGroup {
                kind,
                id,
                expected_revision,
            } => encode(GroupRepository::new(tx, kind).delete(&id, expected_revision)?),
            Self::GetMembers { kind, id } => encode(GroupRepository::new(tx, kind).members(&id)?),
            Self::SetMembers {
                kind,
                id,
                expected_revision,
                note_ids,
            } => encode(GroupRepository::new(tx, kind).set_members(
                &id,
                expected_revision,
                note_ids,
            )?),
        }
    }
}

fn encode(value: impl Serialize) -> Result<Value> {
    serde_json::to_value(value).map_err(|_| StoreError::Internal)
}
