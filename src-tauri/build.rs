fn main() {
    // Keep the default dynamic MSVC CRT (/MD) on Windows so bundled C libraries
    // such as libsqlite3-sys link against the same runtime as Rust test and app binaries.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .windows_attributes(tauri_build::WindowsAttributes::new().static_vc_runtime(false))
            .app_manifest(tauri_build::AppManifest::new().commands(&["store_execute"])),
    )
    .expect("failed to build KNOT command permissions")
}
