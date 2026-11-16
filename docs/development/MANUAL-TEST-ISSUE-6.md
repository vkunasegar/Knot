# Manuelle Testcheckliste — KNOT bis einschließlich Issue #6

Starte im Projektordner mit `pnpm dev`. Verwende für diese Prüfung eigene
Testnotizen, z. B. `Test A – Gedanken 🧶`, `Test B` und `Test C`.
Die Anwendung speichert Änderungen an diesen Notizen tatsächlich lokal.

Meldet das Agent-Terminal bereits `pnpm: Kommando nicht gefunden`, dort einmal
`export PATH="$HOME/.local/bin:$PATH"` eingeben oder ein neues Terminal öffnen.
Der dauerhafte [Agent-Terminal-Suchpfad](AGENT-HOST.md) gilt für neue Sitzungen.

## Start und Desktop-Shell

- [ ] `pnpm dev` startet auch im Agent-Terminal ohne `node: not found` oder
      `cargo: command not found`. Es öffnet sich die native KNOT-App mit sichtbarem
      Inhalt, ohne Browser-Adressleiste.
- [ ] Home, All Notes, Threads, Collections, Favorites, Archive und Settings sind
      erreichbar. Der aktive Bereich ist erkennbar.
- [ ] Zurück/Vorwärts und `Alt+←` / `Alt+→` wechseln innerhalb der bisherigen
      App-Navigation; auch geöffnete Notizen werden korrekt wieder aufgerufen.
- [ ] Sidebar und Context-Panel lassen sich ein-/ausblenden. Unter Settings
      funktionieren die beiden vorhandenen Layout-Schalter ebenfalls.
- [ ] Nach Schließen und erneutem Start sind Sidebar-/Panel-Einstellungen erhalten.

## Erstellen, Öffnen und Titel speichern

- [ ] **New note** legt genau eine Notiz an und öffnet sie. Das Titelfeld erhält
      den Fokus. Ein leerer Titel wird als **Untitled** angezeigt.
- [ ] `Ctrl+N` erstellt ebenfalls eine Notiz. Eine gedrückt gehaltene Taste erzeugt
      keine Notizserie. Auf macOS entspricht das `Cmd+N`.
- [ ] `Ctrl+K` öffnet die Palette. Nach Eingabe von **New note** und Enter wird
      eine Notiz geöffnet; die Palette schließt und das Titelfeld erhält Fokus.
- [ ] Titel `Test A – Gedanken 🧶` eingeben: **Unsaved changes** erscheint.
      **Save title** oder Enter speichert; erst danach erscheint **Saved locally**.
      Umlaute und Emoji werden korrekt angezeigt.
- [ ] Titel verändern und **Cancel title changes** oder Escape drücken:
      Der zuletzt gespeicherte Titel kehrt zurück.
- [ ] Einen Titel verändern, ohne zu speichern; zu Home und wieder zur Notiz
      wechseln. Der Entwurf ist noch vorhanden. Anschließend bewusst speichern
      oder abbrechen.
- [ ] Einen langen Titel verwenden: Die Oberfläche bleibt bedienbar, die Liste
      läuft nicht seitlich aus dem Fenster. Mehr als 4096 UTF-8-Bytes werden mit
      einer Fehlermeldung abgewiesen; die Eingabe bleibt zum Korrigieren erhalten.
- [ ] In All Notes die Notiz öffnen, zur Liste zurückkehren und erneut öffnen:
      Titel und dieselbe Notiz sind erhalten.

## Listen, Favoriten und Duplikate

- [ ] Mehrere Notizen anlegen. All Notes zeigt Titel, Inhaltsvorschau bzw.
      **No text content yet.**, Erstellungsdatum und Änderungsdatum.
- [ ] **Last updated**, **Date created** und **Title A–Z** liefern die erwartete
      Reihenfolge; alphabetisch beispielsweise `Test A`, `Test B`, `Test C`.
- [ ] **Add favorite** aktivieren: Die Notiz erscheint unter Favorites.
      **Remove favorite** entfernt sie dort, erhält sie aber in All Notes.
- [ ] **Duplicate** erzeugt eine eigenständige aktive Notiz mit **(copy)** im Titel.
      Die Kopie ist zunächst kein Favorit. Umbenennen der Kopie verändert das
      Original nicht.

## Archiv, Papierkorb und Undo

- [ ] Eine favorisierte Notiz archivieren: Sie verschwindet aus All Notes und
      Favorites, erscheint aber unter Archive.
- [ ] **Undo** nach dem Archivieren holt genau diese Notiz zurück.
      Die Meldung bleibt bis zum Schließen oder zur nächsten Statusaktion bedienbar.
- [ ] Erneut archivieren und über Archive öffnen. **Restore from archive** bringt
      die Notiz zurück in die aktive Liste; ihr Favoritenstatus bleibt erhalten.
- [ ] **Move to trash** entfernt die Notiz aus All Notes, Favorites und Archive.
      **Undo** stellt sie wieder her.
- [ ] Erneut in den Papierkorb verschieben. Unter **All Notes → Open trash** ist
      sie auffindbar; geöffnet ist der Titel schreibgeschützt. **Restore note**
      stellt sie wieder her.
- [ ] Eine bereits archivierte Notiz in den Papierkorb verschieben und daraus
      wiederherstellen: Sie kehrt nach Archive zurück, nicht direkt nach All Notes.
- [ ] Archivieren, den Titel ändern und speichern, dann **Undo** nutzen:
      Nur der Archivstatus wird zurückgesetzt; der neue Titel bleibt erhalten.
- [ ] Nach Rücknahme/Wiederherstellung sind keine unbeabsichtigten Duplikate
      entstanden. Endgültiges Löschen wird in dieser Version nicht angeboten.

## Vollständiger Neustart und Persistenz

- [ ] Eine aktive, eine favorisierte, eine archivierte und eine im Papierkorb
      befindliche Testnotiz vorbereiten. Alle Titeländerungen ausdrücklich speichern.
- [ ] KNOT vollständig schließen, den laufenden Dev-Befehl bei Bedarf mit `Ctrl+C`
      beenden und mit `pnpm dev` neu starten.
- [ ] Alle vier Notizen sind mit denselben Titeln im passenden Bereich vorhanden.
      Archivierte und gelöschte Notizen lassen sich weiterhin wiederherstellen.
- [ ] Original und Kopie bleiben unabhängig. Falls bereits Notizen mit Inhalt aus
      früheren Speichertests existieren, bleibt ihr Inhalt nach allen Statusaktionen
      und dem Neustart erhalten.

## Tastatur, Focus Mode und Darstellung

- [ ] Die wesentlichen Aktionen sind mit Tab/Shift+Tab und Enter/Leertaste
      erreichbar. Der Tastaturfokus ist sichtbar; es gibt keine Fokusfalle.
- [ ] In der Palette funktionieren Pfeiltasten, Enter und Escape. Escape schließt
      die Palette und führt den Fokus sinnvoll zurück. `Ctrl+N` innerhalb der
      geöffneten Palette legt keine zusätzliche Notiz an.
- [ ] Bei geöffneter Notiz **Enter Focus Mode** wählen: Sidebar, Topbar und
      Context verschwinden. Die Notiz bleibt erhalten. Escape oder **Exit Focus
      Mode** stellt die vorherige Anordnung wieder her.
- [ ] Einen ungespeicherten Titel durch Sidebar-/Panel-/Focus-Wechsel prüfen:
      Der Entwurf geht dabei nicht verloren.
- [ ] Bei 1600×1000 und 1440×900 sowie etwa 960×640 bleiben alle benötigten
      Aktionen erreichbar; es gibt keinen horizontalen Seitenüberlauf.
- [ ] Bei 125 % und 150 % Desktop-Skalierung bleiben Text und Fokus gut lesbar.
      Bei aktivierter Systemeinstellung für reduzierte Bewegung funktioniert alles
      ohne erforderliche Animationen.
- [ ] Falls ein Screenreader verfügbar ist: Bereiche, Titel-Eingabe,
      Speicherstatus und Wiederherstellungsaktionen haben verständliche Namen.

## Erwartete Grenzen dieser Version

Der Notizinhalt ist aktuell eine **Reading view**. Text schreiben/formatieren
folgt in #7; Autosave und Crash-Recovery folgen in #8. Ungespeicherte Titelentwürfe
werden während der Sitzung gehalten, aber nicht über App-Abbruch/Neustart gerettet.
Vor dem Schließen daher **Save title** verwenden.

Home, Threads und Collections zeigen bisher die Shell-Grundansichten. Die Palette
sucht Bereiche/Aktionen, noch keine Notizinhalte. Export/Import, Verknüpfungs- und
Collection-Oberflächen sind spätere Issues. Deshalb ist Collection-Löschung
momentan nicht manuell über die UI prüfbar; der bereits vorhandene native
Regressionstest prüft, dass sie keine Notizen löscht.

Speicherfehler wie eine gesperrte Datenbank, verlorene Bestätigungen und
Revisionskonflikte werden automatisiert geprüft. Für diese normale Abnahme
musst du keine Dateien oder Datenbanken manipulieren.

## Ergebnis

- Datum / Desktop / Skalierung:
- Geprüfter Commit (`git rev-parse --short HEAD`):
- Fehlgeschlagener Punkt und genaue Schritte:
- Erwartetes / beobachtetes Verhalten:
- Screenshot oder Terminalmeldung:
