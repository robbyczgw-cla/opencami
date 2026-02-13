# Changelog

All notable changes to OpenCami are documented here.

## [1.6.0] - 2026-02-13

### Added
- 🔧 **Workspace Settings** — Files, Memory, Agents, Skills & Cron toggles under dedicated "Workspace" section in Settings
- 🔔 **Browser Notifications** — Notified when assistant replies while tab is in background (debounced, permission-aware)
- 🧠 **Memory Viewer** — `/memory` route to browse and edit MEMORY.md and daily memory files with grouped sidebar
- 📂 **File Explorer toggle** — controllable via Settings (default: on)
- 🧠 **Memory Viewer toggle** — controllable via Settings (default: on)

### Changed
- Memory sidebar sorted: MEMORY.md → Daily (newest first) → Notes (alphabetical)

### Fixed
- Memory Viewer file paths correctly prefixed for API compatibility

## [1.5.1] - 2026-02-12

### Added
- ⚡ Lazy-load Shiki syntax highlighting
- 🔍 Promise.allSettled for global search
- 🔒 LocalStorage API key warning in LLM Features settings
- 🧪 162 Vitest tests across 14 files
- 📚 API, Architecture, Contributing, Deployment, Features docs

### Fixed
- Streaming race condition improvements
- MCP fully removed from codebase
- Noir theme removed (replaced by Frost Dark)

## [1.5.0] - 2026-02-11

### Added
- 🖥️ **Tauri Desktop App** (Beta) — Native wrapper with tray icon, notifications, auto-start, multi-window
- 🎨 **Appearance Overhaul** — Frost themes, accent colors, font family, density, chat width, bubble style
- 📦 **Skills Browser** (Beta) — Browse and discover ClawHub skills
- 📄 FAQ page

### Fixed
- Streaming race condition, bulk delete feedback, search jump, Frost Dark CSS, settings dialog width

## [1.4.0] - 2026-02-10

### Added
- 🧩 Code Block Enhancements — line numbers, filename headers, word wrap
- 🤖 Cron Jobs Panel (Beta)
- 🔗 Smart File Links — bare filenames clickable (35+ extensions)
- 📁 Directory Navigation, ✏️ Open in Editor

### Fixed
- Code block rendering, inline file preview, file link click crash, horizontal overflow

## [1.3.2] - 2026-02-09

### Added
- 🧠 Thinking Level Toggle
- 🔌 Multi-Provider LLM Features (OpenAI, OpenRouter, Ollama, Custom)
- ⚙️ Settings sidebar layout, 🎙️ Voice tab

### Performance
- Search optimization, AbortController cleanup
