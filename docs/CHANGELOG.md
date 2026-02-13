## [1.6.0] - 2026-02-13

### Added
- 🔧 **Workspace Settings** — Files, Memory, Agents, Skills & Cron toggles grouped under dedicated "Workspace" section in Settings
- 🔔 **Browser Notifications** — Get notified when assistant replies while tab is in background (debounced, permission-aware)
- 🧠 **Memory Viewer** — New `/memory` route to browse and edit MEMORY.md and daily memory files with grouped sidebar (Daily / Notes sections)
- 📂 **File Explorer toggle** — now controllable via Settings (default: on), no longer always-on
- 🧠 **Memory Viewer toggle** — controllable via Settings (default: on)

### Changed
- File Explorer and Memory Viewer now have visibility toggles in Settings → Workspace
- Memory sidebar sorted: MEMORY.md → Daily files (newest first) → Notes (alphabetical)

### Fixed
- Memory Viewer file paths correctly prefixed for API compatibility
