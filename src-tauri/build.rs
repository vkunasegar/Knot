const WINDOWS_APP_MANIFEST: &str = r#"<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
</assembly>
"#;

fn main() {
    let is_windows_msvc = std::env::var_os("CARGO_CFG_TARGET_OS").is_some_and(|os| os == "windows")
        && std::env::var_os("CARGO_CFG_TARGET_ENV").is_some_and(|env| env == "msvc");

    // Keep the default dynamic MSVC CRT (/MD) on Windows so bundled C libraries
    // such as libsqlite3-sys link against the same runtime as Rust test and app binaries.
    // On Windows MSVC, omit the manifest from tauri-build's bin-only resource.lib and
    // embed it via linker args instead so unit test binaries (`knot_lib-*.exe`) also
    // resolve Common Controls v6 (`comctl32.dll!SetWindowSubclass`) at startup.
    let windows_attributes = if is_windows_msvc {
        tauri_build::WindowsAttributes::new_without_app_manifest().static_vc_runtime(false)
    } else {
        tauri_build::WindowsAttributes::new().static_vc_runtime(false)
    };

    tauri_build::try_build(
        tauri_build::Attributes::new()
            .windows_attributes(windows_attributes)
            .app_manifest(tauri_build::AppManifest::new().commands(&["store_execute"])),
    )
    .expect("failed to build KNOT command permissions");

    if is_windows_msvc {
        let out_dir = std::path::PathBuf::from(
            std::env::var_os("OUT_DIR").expect("missing OUT_DIR for Windows manifest"),
        );
        let manifest_path = out_dir.join("windows-app-manifest.xml");
        std::fs::write(&manifest_path, WINDOWS_APP_MANIFEST)
            .expect("failed to write Windows Common Controls manifest");
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!(
            "cargo:rustc-link-arg=/MANIFESTINPUT:{}",
            manifest_path.display()
        );
    }
}
