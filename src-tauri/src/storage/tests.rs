use super::*;
use rusqlite::Connection;
use serde_json::json;
use tempfile::TempDir;

/// Every workflow enters through the actual JSON request protocol and uses a
/// temporary on-disk SQLite file, including WAL, foreign keys and real commits.
struct Harness {
    directory: TempDir,
    service: StoreService,
}
impl Harness {
    fn new() -> Self {
        let directory = tempfile::tempdir().unwrap();
        let service = StoreService::at_path(Ok(directory.path().join("knot.sqlite3")));
        Self { directory, service }
    }
    fn path(&self) -> PathBuf {
        self.directory.path().join("knot.sqlite3")
    }
    fn call(&self, request: Value) -> Result<Value> {
        self.service
            .execute(serde_json::from_value(request).map_err(|_| StoreError::InvalidInput)?)
    }
    fn note(&self) -> Value {
        self.call(json!({"operation":"createNote", "input":note_input()}))
            .unwrap()
    }
    fn group(&self, kind: &str) -> Value {
        self.call(json!({"operation":"createGroup", "kind":kind, "input":{"name":"Ideas", "description":"A path"}})).unwrap()
    }
    fn members(&self, kind: &str, group: &Value, ids: Vec<Value>) -> Result<Value> {
        self.call(
            json!({"operation":"setMembers", "kind":kind, "id":group["id"],
            "expectedRevision":group["revision"], "noteIds":ids}),
        )
    }
}
fn note_input() -> Value {
    json!({"title":"A thought 🧶", "body":{"version":1,"document":{"type":"doc","content":[
        {"type":"paragraph","content":[{"type":"text","text":"Never lose this", "marks":[{"type":"futureMark","attrs":{"value":42}}]}]}
    ]},"futureMetadata":{"keep":true}}, "isFavorite":false,"isArchived":false,"isDeleted":false})
}
fn link(a: &Value, b: &Value) -> Value {
    json!({"sourceNoteId":a["id"], "targetNoteId":b["id"], "kind":"related", "direction":"undirected", "strength":0.5})
}

#[test]
fn migrates_empty_database_and_reopens_without_changing_documents() {
    let h = Harness::new();
    let note = h.note();
    let path = h.path();
    drop(h.service);
    let reopened = StoreService::at_path(Ok(path.clone()));
    let actual = reopened
        .execute(serde_json::from_value(json!({"operation":"getNote", "id":note["id"]})).unwrap())
        .unwrap();
    assert_eq!(actual, note);
    let db = Connection::open(path).unwrap();
    assert_eq!(
        db.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        1
    );
    assert_eq!(
        db.query_row("SELECT count(*) FROM schema_migration", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        1
    );
    assert_eq!(
        db.query_row("PRAGMA journal_mode", [], |r| r.get::<_, String>(0))
            .unwrap(),
        "wal"
    );
}

#[test]
fn note_crud_preserves_editor_data_and_rejects_stale_updates() {
    let h = Harness::new();
    let note = h.note();
    assert_eq!(note["body"], note_input()["body"]);
    assert_eq!(
        h.call(json!({"operation":"listNotes"})).unwrap(),
        json!([note])
    );
    assert_eq!(
        h.call(json!({"operation":"purgeNote","id":note["id"],"expectedRevision":1})),
        Err(StoreError::Conflict)
    );
    let mut input = note_input();
    input["title"] = json!("Edited");
    input["isFavorite"] = json!(true);
    input["isArchived"] = json!(true);
    let update =
        json!({"operation":"updateNote","id":note["id"],"expectedRevision":1,"input":input});
    let edited = h.call(update.clone()).unwrap();
    assert_eq!(edited["revision"], 2);
    assert_eq!(edited["title"], "Edited");
    assert_eq!(edited["isFavorite"], true);
    assert!(edited["archivedAt"].is_number());
    assert_eq!(h.call(update), Err(StoreError::Conflict));
    input["isArchived"] = json!(false);
    input["isDeleted"] = json!(true);
    let trashed = h
        .call(json!({"operation":"updateNote","id":note["id"],"expectedRevision":2,"input":input}))
        .unwrap();
    assert!(trashed["archivedAt"].is_null());
    assert!(trashed["deletedAt"].is_number());
    input["isDeleted"] = json!(false);
    let restored = h
        .call(json!({"operation":"updateNote","id":note["id"],"expectedRevision":3,"input":input}))
        .unwrap();
    assert!(restored["deletedAt"].is_null());
    assert_eq!(restored["body"], note["body"]);
    assert_eq!(
        h.call(json!({"operation":"getNote","id":domain::Id::new()})),
        Err(StoreError::NotFound)
    );
}

#[test]
fn validates_wire_input_without_changing_existing_content() {
    let h = Harness::new();
    let note = h.note();
    for body in [
        json!(null),
        json!({"version":2,"document":{"type":"doc"}}),
        json!({"version":1,"document":{}}),
    ] {
        let mut input = note_input();
        input["body"] = body;
        assert_eq!(
            h.call(
                json!({"operation":"updateNote","id":note["id"],"expectedRevision":1,"input":input})
            ),
            Err(StoreError::InvalidInput)
        );
    }
    for request in [
        json!({"operation":"getNote","id":"not-an-id"}),
        json!({"operation":"listNotes","sql":"DELETE FROM note"}),
        json!({"operation":"runSql"}),
        json!({"operation":"getNote","id":"00000000-0000-0000-0000-000000000000"}),
    ] {
        assert_eq!(h.call(request), Err(StoreError::InvalidInput));
    }
    let mut input = note_input();
    input["title"] = json!("x".repeat(4097));
    assert_eq!(
        h.call(json!({"operation":"createNote","input":input})),
        Err(StoreError::InvalidInput)
    );
    assert_eq!(
        h.call(json!({"operation":"getNote","id":note["id"]}))
            .unwrap(),
        note
    );
}

#[test]
fn connection_crud_normalizes_pairs_and_enforces_link_identity() {
    let h = Harness::new();
    let a = h.note();
    let b = h.note();
    let input = link(&a, &b);
    let connection = h
        .call(json!({"operation":"createConnection","input":input}))
        .unwrap();
    assert!(connection["sourceNoteId"].as_str() < connection["targetNoteId"].as_str());
    assert_eq!(
        h.call(json!({"operation":"createConnection","input":link(&b,&a)})),
        Err(StoreError::Conflict)
    );
    assert_eq!(
        h.call(json!({"operation":"createConnection","input":link(&a,&a)})),
        Err(StoreError::InvalidInput)
    );
    let mut changed = input.clone();
    changed["strength"] = json!(0.9);
    let updated = h.call(json!({"operation":"updateConnection","id":connection["id"],"expectedRevision":1,"input":changed})).unwrap();
    assert_eq!(updated["strength"], 0.9);
    assert_eq!(updated["revision"], 2);
    assert_eq!(
        h.call(json!({"operation":"getConnection","id":connection["id"]}))
            .unwrap(),
        updated
    );
    let mut directed = input.clone();
    directed["direction"] = json!("directed");
    let first = h
        .call(json!({"operation":"createConnection","input":directed}))
        .unwrap();
    let mut reverse = link(&b, &a);
    reverse["direction"] = json!("directed");
    h.call(json!({"operation":"createConnection","input":reverse}))
        .unwrap();
    let mut another_kind = input.clone();
    another_kind["kind"] = json!("supports");
    h.call(json!({"operation":"createConnection","input":another_kind}))
        .unwrap();
    assert_eq!(h.call(json!({"operation":"updateConnection","id":first["id"],"expectedRevision":1,"input":input})), Err(StoreError::Conflict));
    assert_eq!(
        h.call(json!({"operation":"deleteConnection","id":connection["id"],"expectedRevision":1})),
        Err(StoreError::Conflict)
    );
    assert_eq!(
        h.call(json!({"operation":"deleteConnection","id":connection["id"],"expectedRevision":2}))
            .unwrap(),
        Value::Null
    );
    assert_eq!(
        h.call(json!({"operation":"getConnection","id":connection["id"]})),
        Err(StoreError::NotFound)
    );
    assert_eq!(
        h.call(json!({"operation":"listConnections"}))
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        3
    );
}

#[test]
fn invalid_and_orphan_connections_fail_without_partial_updates() {
    let h = Harness::new();
    let a = h.note();
    let b = h.note();
    let edge = h
        .call(json!({"operation":"createConnection","input":link(&a,&b)}))
        .unwrap();
    let mut orphan = link(&a, &b);
    orphan["targetNoteId"] = json!(domain::Id::new());
    assert_eq!(
        h.call(json!({"operation":"createConnection","input":orphan})),
        Err(StoreError::Conflict)
    );
    assert_eq!(h.call(json!({"operation":"updateConnection","id":edge["id"],"expectedRevision":1,"input":orphan})), Err(StoreError::Conflict));
    for weight in [json!(-0.1), json!(1.1), Value::Null] {
        let mut input = link(&a, &b);
        input["strength"] = weight;
        assert_eq!(
            h.call(json!({"operation":"createConnection","input":input})),
            Err(StoreError::InvalidInput)
        );
    }
    assert_eq!(
        h.call(json!({"operation":"getConnection","id":edge["id"]}))
            .unwrap(),
        edge
    );
}

#[test]
fn collections_and_threads_support_atomic_membership_crud_and_independent_ownership() {
    let h = Harness::new();
    let a = h.note();
    let b = h.note();
    let c = h.note();
    for kind in ["collection", "thread"] {
        let group = h.group(kind);
        let other = h.group(kind);
        assert_eq!(
            h.call(json!({"operation":"getGroup","kind":kind,"id":group["id"]}))
                .unwrap(),
            group
        );
        let snapshot = h
            .members(kind, &group, vec![a["id"].clone(), b["id"].clone()])
            .unwrap();
        h.members(kind, &other, vec![a["id"].clone()]).unwrap();
        assert_eq!(h.members(kind, &group, vec![]), Err(StoreError::Conflict));
        assert_eq!(
            h.members(
                kind,
                &snapshot["group"],
                vec![a["id"].clone(), a["id"].clone()]
            ),
            Err(StoreError::InvalidInput)
        );
        // The first replacement insert succeeds; the second violates an FK.
        // Both must roll back, restoring the old order AND parent revision.
        assert_eq!(
            h.members(
                kind,
                &snapshot["group"],
                vec![c["id"].clone(), json!(domain::Id::new())]
            ),
            Err(StoreError::Conflict)
        );
        assert_eq!(
            h.call(json!({"operation":"getMembers","kind":kind,"id":group["id"]}))
                .unwrap(),
            snapshot
        );
        let reordered = h
            .members(
                kind,
                &snapshot["group"],
                vec![b["id"].clone(), a["id"].clone(), c["id"].clone()],
            )
            .unwrap();
        assert_eq!(
            reordered["members"][0],
            json!({"noteId":b["id"],"position":0})
        );
        let removed = h
            .members(kind, &reordered["group"], vec![a["id"].clone()])
            .unwrap();
        assert_eq!(removed["members"].as_array().unwrap().len(), 1);
        let cleared = h.members(kind, &removed["group"], vec![]).unwrap();
        assert_eq!(cleared["members"], json!([]));
        let renamed = h.call(json!({"operation":"updateGroup","kind":kind,"id":group["id"],
            "expectedRevision":cleared["group"]["revision"],"input":{"name":"Renamed", "description":"Changed"}})).unwrap();
        assert_eq!(renamed["name"], "Renamed");
        assert_eq!(
            h.call(json!({"operation":"listGroups","kind":kind}))
                .unwrap()
                .as_array()
                .unwrap()
                .len(),
            2
        );
        assert_eq!(
            h.call(
                json!({"operation":"deleteGroup","kind":kind,"id":group["id"],"expectedRevision":1})
            ),
            Err(StoreError::Conflict)
        );
        let full = h
            .members(kind, &renamed, vec![a["id"].clone(), b["id"].clone()])
            .unwrap();
        h.call(json!({"operation":"deleteGroup","kind":kind,"id":group["id"],"expectedRevision":full["group"]["revision"]})).unwrap();
        assert_eq!(
            h.call(json!({"operation":"getMembers","kind":kind,"id":group["id"]})),
            Err(StoreError::NotFound)
        );
        assert_eq!(
            h.call(json!({"operation":"getMembers","kind":kind,"id":other["id"]}))
                .unwrap()["members"]
                .as_array()
                .unwrap()
                .len(),
            1
        );
    }
    assert_eq!(
        h.call(json!({"operation":"listNotes"}))
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        3
    );
    assert_eq!(
        h.call(json!({"operation":"listConnections"})).unwrap(),
        json!([])
    );
}

#[test]
fn trash_preserves_relationships_and_purge_cascades_only_owned_links() {
    let h = Harness::new();
    let a = h.note();
    let b = h.note();
    let c = h.note();
    let collection = h.group("collection");
    let thread = h.group("thread");
    h.members(
        "collection",
        &collection,
        vec![a["id"].clone(), b["id"].clone()],
    )
    .unwrap();
    h.members("thread", &thread, vec![a["id"].clone(), b["id"].clone()])
        .unwrap();
    h.call(json!({"operation":"createConnection","input":link(&a,&b)}))
        .unwrap();
    h.call(json!({"operation":"createConnection","input":link(&c,&a)}))
        .unwrap();
    let kept = h
        .call(json!({"operation":"createConnection","input":link(&b,&c)}))
        .unwrap();
    let mut input = note_input();
    input["isDeleted"] = json!(true);
    h.call(json!({"operation":"updateNote","id":a["id"],"expectedRevision":1,"input":input}))
        .unwrap();
    assert_eq!(
        h.call(json!({"operation":"listConnections"}))
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        3
    );
    assert_eq!(
        h.call(json!({"operation":"purgeNote","id":a["id"],"expectedRevision":1})),
        Err(StoreError::Conflict)
    );
    h.call(json!({"operation":"purgeNote","id":a["id"],"expectedRevision":2}))
        .unwrap();
    assert_eq!(
        h.call(json!({"operation":"listConnections"})).unwrap(),
        json!([kept])
    );
    assert_eq!(
        h.call(json!({"operation":"getNote","id":a["id"]})),
        Err(StoreError::NotFound)
    );
    for (kind, group) in [("collection", collection), ("thread", thread)] {
        let members = h
            .call(json!({"operation":"getMembers","kind":kind,"id":group["id"]}))
            .unwrap();
        assert_eq!(members["members"], json!([{"noteId":b["id"],"position":1}]));
        assert_eq!(members["group"]["revision"], 3);
    }
    assert_eq!(
        h.call(json!({"operation":"getNote","id":b["id"]})).unwrap(),
        b
    );
}

#[test]
fn failed_migration_rolls_back_schema_history_and_prior_data_changes() {
    let h = Harness::new();
    let original = h.note();
    let mut db = Connection::open(h.path()).unwrap();
    let mut plan = migrations::MIGRATIONS.to_vec();
    plan.push((
        "broken",
        "UPDATE note SET title='lost'; CREATE TABLE partial(id INTEGER); INVALID SQL;",
    ));
    assert!(migrations::MigrationRunner::apply(&mut db, &plan).is_err());
    assert_eq!(
        db.query_row("PRAGMA user_version", [], |r| r.get::<_, i64>(0))
            .unwrap(),
        1
    );
    assert_eq!(
        db.query_row(
            "SELECT count(*) FROM sqlite_schema WHERE name='partial'",
            [],
            |r| r.get::<_, i64>(0)
        )
        .unwrap(),
        0
    );
    assert_eq!(
        h.call(json!({"operation":"getNote","id":original["id"]}))
            .unwrap(),
        original
    );
    migrations::MigrationRunner::run(&mut db).unwrap();
}

#[test]
fn refuses_future_foreign_and_modified_schemas_without_resetting_them() {
    for change in [
        "PRAGMA user_version=99",
        "UPDATE schema_migration SET sql='changed'",
        "PRAGMA application_id=123",
    ] {
        let h = Harness::new();
        let original = h.note();
        let path = h.path();
        drop(h.service);
        let db = Connection::open(&path).unwrap();
        db.execute_batch(change).unwrap();
        let service = StoreService::at_path(Ok(path));
        assert_eq!(
            service.execute(request::Request::ListNotes {}),
            Err(StoreError::IncompatibleSchema)
        );
        assert_eq!(
            db.query_row("SELECT title FROM note", [], |r| r.get::<_, String>(0))
                .unwrap(),
            original["title"].as_str().unwrap()
        );
    }
    let h = Harness::new();
    let db = Connection::open(h.path()).unwrap();
    db.execute_batch(
        "CREATE TABLE foreign_data(content TEXT); INSERT INTO foreign_data VALUES ('keep');",
    )
    .unwrap();
    assert_eq!(
        h.call(json!({"operation":"listNotes"})),
        Err(StoreError::IncompatibleSchema)
    );
    assert_eq!(
        db.query_row("SELECT content FROM foreign_data", [], |r| r
            .get::<_, String>(0))
            .unwrap(),
        "keep"
    );
}

#[test]
fn detects_existing_orphans_without_deleting_them() {
    let h = Harness::new();
    let a = h.note();
    let b = h.note();
    h.call(json!({"operation":"createConnection","input":link(&a,&b)}))
        .unwrap();
    let path = h.path();
    drop(h.service);
    let db = Connection::open(&path).unwrap();
    db.execute_batch("PRAGMA foreign_keys=OFF; DELETE FROM note;")
        .unwrap();
    let service = StoreService::at_path(Ok(path));
    assert_eq!(
        service.execute(request::Request::ListNotes {}),
        Err(StoreError::CorruptDatabase)
    );
    assert_eq!(
        db.query_row("SELECT count(*) FROM connection", [], |r| r
            .get::<_, i64>(0))
            .unwrap(),
        1
    );
}

#[test]
fn corrupt_files_and_invalid_stored_documents_are_never_replaced() {
    let h = Harness::new();
    std::fs::write(h.path(), b"not a database - keep me").unwrap();
    assert_eq!(
        h.call(json!({"operation":"listNotes"})),
        Err(StoreError::CorruptDatabase)
    );
    assert_eq!(
        std::fs::read(h.path()).unwrap(),
        b"not a database - keep me"
    );
    let h = Harness::new();
    let note = h.note();
    let db = Connection::open(h.path()).unwrap();
    db.execute("UPDATE note SET body_json='{}'", []).unwrap();
    assert_eq!(
        h.call(json!({"operation":"getNote","id":note["id"]})),
        Err(StoreError::CorruptDatabase)
    );
    assert_eq!(
        db.query_row("SELECT body_json FROM note", [], |r| r.get::<_, String>(0))
            .unwrap(),
        "{}"
    );
}

#[test]
fn busy_writes_recover_and_failed_open_is_retryable() {
    let h = Harness::new();
    let note = h.note();
    let lock = Connection::open(h.path()).unwrap();
    lock.execute_batch("BEGIN IMMEDIATE").unwrap();
    let request =
        json!({"operation":"updateNote","id":note["id"],"expectedRevision":1,"input":note_input()});
    assert_eq!(h.call(request.clone()), Err(StoreError::Busy));
    lock.execute_batch("ROLLBACK").unwrap();
    assert_eq!(h.call(request).unwrap()["revision"], 2);

    let directory = tempfile::tempdir().unwrap();
    let parent = directory.path().join("blocked");
    std::fs::write(&parent, b"obstacle").unwrap();
    let service = StoreService::at_path(Ok(parent.join("knot.sqlite3")));
    assert_eq!(
        service.execute(request::Request::ListNotes {}),
        Err(StoreError::Unavailable)
    );
    assert_eq!(std::fs::read(&parent).unwrap(), b"obstacle");
    std::fs::remove_file(parent).unwrap();
    assert_eq!(
        service.execute(request::Request::ListNotes {}).unwrap(),
        json!([])
    );
}

#[test]
fn concurrent_services_cannot_overwrite_a_newer_revision() {
    let h = Harness::new();
    let note = h.note();
    let path = h.path();
    let barrier = Arc::new(std::sync::Barrier::new(2));
    let mut jobs = Vec::new();
    for title in ["first", "second"] {
        let service = StoreService::at_path(Ok(path.clone()));
        service.execute(request::Request::ListNotes {}).unwrap();
        let barrier = barrier.clone();
        let id = note["id"].clone();
        jobs.push(std::thread::spawn(move || {
            let mut input = note_input();
            input["title"] = json!(title);
            let request = serde_json::from_value(
                json!({"operation":"updateNote","id":id,"expectedRevision":1,"input":input}),
            )
            .unwrap();
            barrier.wait();
            service.execute(request)
        }));
    }
    let results: Vec<_> = jobs.into_iter().map(|job| job.join().unwrap()).collect();
    assert_eq!(results.iter().filter(|r| r.is_ok()).count(), 1);
    assert_eq!(
        results
            .iter()
            .filter(|r| **r == Err(StoreError::Conflict))
            .count(),
        1
    );
    let saved = h
        .call(json!({"operation":"getNote","id":note["id"]}))
        .unwrap();
    assert_eq!(
        &saved,
        results.iter().find_map(|r| r.as_ref().ok()).unwrap()
    );
}

#[test]
fn sqlite_enforces_foreign_keys_and_order_constraints_without_repository_validation() {
    let h = Harness::new();
    let a = h.note();
    let group = h.group("thread");
    let db = Connection::open(h.path()).unwrap();
    db.pragma_update(None, "foreign_keys", true).unwrap();
    let id = group["id"].as_str().unwrap();
    let note_id = a["id"].as_str().unwrap();
    db.execute("INSERT INTO thread_note VALUES (?1, ?2, 0)", [id, note_id])
        .unwrap();
    assert!(
        db.execute("INSERT INTO thread_note VALUES (?1, ?2, 1)", [id, note_id])
            .is_err()
    );
    assert!(
        db.execute(
            "INSERT INTO thread_note VALUES (?1, ?2, 1)",
            [id, "00000000-0000-4000-8000-000000000001"]
        )
        .is_err()
    );
    assert!(
        db.execute("UPDATE thread_note SET position=-1", [])
            .is_err()
    );
    assert!(db.execute("UPDATE note SET is_favorite=3", []).is_err());
    assert!(
        db.execute("UPDATE note SET body_json='not json'", [])
            .is_err()
    );
}

#[test]
fn command_uses_real_permissions_and_returns_committed_data_or_stable_errors() {
    use tauri::test::{INVOKE_KEY, get_ipc_response, mock_builder, noop_assets};
    let h = Harness::new();
    let mut context = tauri::generate_context!();
    context.set_assets(Box::new(noop_assets()));
    let app = mock_builder()
        .manage(Arc::new(h.service))
        .invoke_handler(tauri::generate_handler![store_execute])
        .build(context)
        .unwrap();
    let main = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
        .build()
        .unwrap();
    let other = tauri::WebviewWindowBuilder::new(&app, "other", Default::default())
        .build()
        .unwrap();
    let local_url = main.url().unwrap().to_string();
    let call =
        |window: &tauri::WebviewWindow<tauri::test::MockRuntime>, url: &str, request: Value| {
            get_ipc_response(
                window,
                tauri::webview::InvokeRequest {
                    cmd: "store_execute".into(),
                    callback: tauri::ipc::CallbackFn(0),
                    error: tauri::ipc::CallbackFn(1),
                    url: url.parse().unwrap(),
                    body: tauri::ipc::InvokeBody::Json(json!({"request":request})),
                    headers: Default::default(),
                    invoke_key: INVOKE_KEY.to_owned(),
                },
            )
            .map(|response| response.deserialize::<Value>().unwrap())
        };
    let note = call(
        &main,
        &local_url,
        json!({"operation":"createNote","input":note_input()}),
    )
    .unwrap();
    assert_eq!(note["body"], note_input()["body"]);
    assert_eq!(
        call(
            &main,
            &local_url,
            json!({"operation":"getNote","id":note["id"]})
        )
        .unwrap(),
        note
    );
    assert_eq!(
        call(
            &main,
            &local_url,
            json!({"operation":"getNote","id":"invalid"})
        ),
        Err(json!("invalidInput"))
    );
    assert!(call(&other, &local_url, json!({"operation":"listNotes"})).is_err());
    assert!(
        call(
            &main,
            "https://example.com",
            json!({"operation":"listNotes"})
        )
        .is_err()
    );
}
