-- STRICT tables and CHECKs protect the file even when writes bypass a repository.
CREATE TABLE note (
    id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
    title TEXT NOT NULL CHECK(length(CAST(title AS BLOB)) <= 4096 AND instr(title, char(0)) = 0),
    body_json TEXT NOT NULL CHECK(json_valid(body_json) AND length(CAST(body_json AS BLOB)) <= 10485760),
    is_favorite INTEGER NOT NULL CHECK(is_favorite IN (0, 1)),
    created_at INTEGER NOT NULL CHECK(created_at >= 0),
    updated_at INTEGER NOT NULL CHECK(updated_at >= created_at),
    archived_at INTEGER CHECK(archived_at >= 0),
    deleted_at INTEGER CHECK(deleted_at >= 0),
    revision INTEGER NOT NULL CHECK(revision > 0)
) STRICT;
CREATE INDEX note_recent ON note(deleted_at, archived_at, updated_at DESC, id);
CREATE INDEX note_favorites ON note(is_favorite, deleted_at, updated_at DESC);

CREATE TABLE connection (
    id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
    source_note_id TEXT NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    target_note_id TEXT NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK(kind IN ('related', 'supports', 'contradicts', 'references')),
    direction TEXT NOT NULL CHECK(direction IN ('directed', 'undirected')),
    strength REAL NOT NULL CHECK(strength >= 0 AND strength <= 1),
    created_at INTEGER NOT NULL CHECK(created_at >= 0),
    updated_at INTEGER NOT NULL CHECK(updated_at >= created_at),
    revision INTEGER NOT NULL CHECK(revision > 0),
    CHECK(source_note_id <> target_note_id),
    CHECK(direction <> 'undirected' OR source_note_id < target_note_id),
    UNIQUE(source_note_id, target_note_id, kind, direction)
) STRICT;
-- The unique index covers outgoing links; incoming traversal needs its own index.
CREATE INDEX connection_target ON connection(target_note_id);

CREATE TABLE collection (
    id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0 AND length(CAST(name AS BLOB)) <= 4096 AND instr(name, char(0)) = 0),
    description TEXT NOT NULL CHECK(length(CAST(description AS BLOB)) <= 65536 AND instr(description, char(0)) = 0),
    created_at INTEGER NOT NULL CHECK(created_at >= 0),
    updated_at INTEGER NOT NULL CHECK(updated_at >= created_at),
    revision INTEGER NOT NULL CHECK(revision > 0)
) STRICT;
CREATE TABLE thread (
    id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 36),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0 AND length(CAST(name AS BLOB)) <= 4096 AND instr(name, char(0)) = 0),
    description TEXT NOT NULL CHECK(length(CAST(description AS BLOB)) <= 65536 AND instr(description, char(0)) = 0),
    created_at INTEGER NOT NULL CHECK(created_at >= 0),
    updated_at INTEGER NOT NULL CHECK(updated_at >= created_at),
    revision INTEGER NOT NULL CHECK(revision > 0)
) STRICT;
CREATE TABLE collection_note (
    group_id TEXT NOT NULL REFERENCES collection(id) ON DELETE CASCADE,
    note_id TEXT NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK(position >= 0),
    PRIMARY KEY(group_id, note_id),
    UNIQUE(group_id, position)
) STRICT;
CREATE INDEX collection_note_reverse ON collection_note(note_id);
CREATE TABLE thread_note (
    group_id TEXT NOT NULL REFERENCES thread(id) ON DELETE CASCADE,
    note_id TEXT NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    position INTEGER NOT NULL CHECK(position >= 0),
    PRIMARY KEY(group_id, note_id),
    UNIQUE(group_id, position)
) STRICT;
CREATE INDEX thread_note_reverse ON thread_note(note_id);
-- A thread is an ordered sequence, not a side effect of pairwise connections.
-- Knot and Loop remain derived graph concepts and therefore have no tables.
