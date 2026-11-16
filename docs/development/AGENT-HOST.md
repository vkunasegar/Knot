# pnpm aus dem Agent-/Flatpak-Terminal

Das Agent-Terminal läuft auf diesem Rechner im Freedesktop-Flatpak-Runtime,
während das normale KNOT-/Host-Terminal die vorbereitete CachyOS-Umgebung nutzt.
Dateien sind gemeinsam sichtbar, Programme und Bibliotheken unter `/usr` jedoch
nicht. Der eigenständig ausführbare pnpm-Launcher startet im Agent-Terminal,
aber Tauri benötigt anschließend Node und Cargo. Vor der Einrichtung scheiterte
`pnpm exec tauri --version` dort mit `exec: node: not found`.

Die lokale KNOT-Weiterleitung führt pnpm-Befehle deshalb aus einer Flatpak-Sitzung
innerhalb dieses Checkouts auf dem Rechner-Host aus. Arbeitsverzeichnis,
Argumente und Rückgabestatus bleiben erhalten. Normale Host-Terminals und andere
Projektverzeichnisse verwenden weiterhin den ursprünglichen pnpm-Launcher.
Es werden keine zusätzlichen Node-/Rust-/GTK-Kopien in die Agent-Umgebung installiert.

## Einrichten und verwenden

Einmal im vorbereiteten Host-Terminal im KNOT-Projektordner:

```sh
pnpm setup:agent-host
```

Alternativ vor der ersten Einrichtung direkt aus dem Agent-Terminal:

```sh
flatpak-spawn --host --directory="$PWD" sh -lc 'node scripts/install-agent-host-bridge.mjs'
```

Anschließend im Agent-Terminal im Projektordner wie gewohnt:

```sh
pnpm check:linux
pnpm dev
```

Falls bereits `pnpm` selbst nicht gefunden wird, fehlt `~/.local/bin` im
Terminal-Suchpfad. Eine interaktive `sh` ohne Login liest `~/.profile` nicht.
Für das bereits offene Terminal einmal ausführen:

```sh
export PATH="$HOME/.local/bin:$PATH"
pnpm dev
```

Für neue VS-Code-Terminals muss der Linux-Terminal-Suchpfad den Launcher ebenfalls
enthalten. Auf diesem Rechner ist deshalb im Benutzerprofil
`~/.var/app/com.visualstudio.code/config/Code/User/settings.json` gesetzt:

```json
"terminal.integrated.env.linux": {
  "PATH": "${env:HOME}/.local/bin:${env:PATH}"
}
```

Die Einstellung gilt für neu gestartete Terminals. Ein bereits geöffnetes Terminal
behält seinen bisherigen Suchpfad; dort den obigen `export` verwenden oder das
Terminal schließen und neu öffnen. Bestehende Einstellungen wurden erhalten und
vorher unter `settings.json.knot-pnpm-path-backup` gesichert.

KNOT erscheint als native Desktop-App auf dem Rechner. `Ctrl+C` beendet den
laufenden Dev-Befehl; `--watch-bus` bindet den Host-Prozess zusätzlich an die
Flatpak-Verbindung. Die Host-Toolchain und die gleichen Dateien werden verwendet.
Die Anwendung nutzt ihr normales lokales Datenprofil.

Der Installer ersetzt ausschließlich `~/.local/bin/pnpm` durch einen kleinen
Shell-Launcher und erhält den ursprünglichen Eintrag unverändert unter
`~/.local/bin/pnpm.knot-original`, einschließlich eines vorhandenen Symlinks.
Shell-Startdateien müssen nicht geändert werden; der Terminal-Suchpfad ist separat
wie oben beschrieben eingerichtet. Die Launcher-Einrichtung ist wiederholbar. Bei Umzug des
Checkouts erneut ausführen. Vor einer pnpm-Neuinstallation die Weiterleitung
entfernen und anschließend neu einrichten.

## Entfernen

```sh
pnpm setup:agent-host --uninstall
```

Dies stellt den ursprünglichen pnpm-Eintrag wieder her. Projektdateien,
Abhängigkeiten und Notizen bleiben erhalten. Ein fremder vorhandener Backup-Eintrag
wird beim Installieren nicht überschrieben. Scheitert die Host-Weiterleitung,
wird der Befehl mit Fehler beendet, statt ihn in der unvollständigen Sandbox
erneut auszuführen.

Die Weiterleitung betrifft nur `pnpm`. Direkt eingegebenes `node` oder `cargo`
wird dadurch nicht in der Agent-Umgebung installiert. Dafür weiterhin ein
Host-Terminal verwenden oder ausdrücklich über `flatpak-spawn --host` starten.

Zur Abnahme der Desktop-App siehe die
[manuelle Checkliste bis Issue #6](MANUAL-TEST-ISSUE-6.md).

## Verifiziert auf diesem Rechner

Am 2026-11-16 wurde die Weiterleitung installiert und direkt aus der
Agent-/Flatpak-Umgebung geprüft:

- `pnpm exec tauri --version`: erfolgreich; vorher `exec: node: not found`.
- Interaktive `sh` ohne Login mit dem konfigurierten Linux-Terminal-Suchpfad:
  `command -v pnpm` findet den Launcher und `pnpm exec tauri --version` funktioniert.
- `pnpm check:linux`: Node, pnpm, Rust/Cargo und native Bibliotheken gefunden.
- `pnpm dev`: Vite gestartet, Rust-Debug-App gestartet und das native Fenster
  über AT-SPI mit Home und New note bestätigt. Anschließend mit `Ctrl+C` beendet;
  kein KNOT-Debug-Prozess und kein Listener auf Port 1420 blieben zurück.
- `pnpm setup:agent-host`: erneute Installation erfolgreich, Original-Symlink erhalten.
- `pnpm format:check`, `pnpm check`, `pnpm lint`: erfolgreich.
- `pnpm test`: 134 Tests in 21 Dateien erfolgreich, einschließlich sechs neuer
  Tests für Argumentübergabe, Projektbegrenzung, Wiederholbarkeit/Rückbau,
  Backup-Konflikte und Transportfehler.

Die Installer-Tests verwenden ausschließlich temporäre Verzeichnisse und eine
simulierte Host-Weiterleitung. Sie ändern keine echte Benutzerkonfiguration.
