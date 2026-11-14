mod storage;

use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(Arc::new(storage::StoreService::new(
                app.path().app_data_dir(),
            )));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![storage::store_execute])
        .run(tauri::generate_context!())
        .expect("error while running KNOT");
}
