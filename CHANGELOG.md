# Changelog

All notable changes to OpenCami are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [Semantic Versioning](https://semver.org/).

## [1.6.0] - 2026-02-13

### Added
- 🔧 **Workspace Settings** — Files, Memory, Agents, Skills & Cron toggles under dedicated "Workspace" section in Settings
- 🔔 **Browser Notifications** — Get notified when assistant replies while tab is in background (debounced, permission-aware)
- 🧠 **Memory Viewer** — `/memory` route to browse and edit MEMORY.md and daily memory files with grouped sidebar (Daily / Notes sections)
- 📂 **File Explorer toggle** — controllable via Settings (default: on)
- 🧠 **Memory Viewer toggle** — controllable via Settings (default: on)

### Changed
- File Explorer and Memory Viewer now have visibility toggles in Settings → Workspace
- Memory sidebar sorted: MEMORY.md → Daily files (newest first) → Notes (alphabetical)

### Fixed
- Memory Viewer file paths correctly prefixed for API compatibility

## [1.5.1] - 2026-02-12

### Added
- ⚡ **Lazy-load Shiki** syntax highlighting — Dynamic imports for language grammars
- 🔍 **Promise.allSettled** for global search — Failed session fetches no longer block
- 🔒 **LocalStorage API key warning** — Visible warning in LLM Features settings
- 🧪 **Comprehensive test suite** — 162 Vitest tests across 14 files
- 📚 **Documentation** — API, Architecture, Contributing, Deployment, Features docs

### Fixed
- Streaming race condition improvements
- MCP fully removed from codebase
- Noir theme removed (replaced by Frost Dark)

## [1.5.0] - 2026-02-11

### Added
- 🖥️ **Tauri Desktop App** (Beta) — Native wrapper with tray icon, notifications, auto-start, custom titlebar, multi-window
- 🎨 **Appearance Overhaul** — Frost Light/Dark themes, accent colors (7 options), font family, message density, chat width, bubble style
- 📦 **Skills Browser** (Beta) — Browse, search, and discover skills from ClawHub
- 📄 **FAQ** page

### Changed
- Compact Settings layout, theme labels, reduced fonts, mobile scroll fix, settings polish

### Fixed
- Streaming race condition, bulk delete feedback, search jump to message, Frost Dark CSS, settings dialog width

## [1.4.0] - 2026-02-10

### Added
- 🧩 **Code Block Enhancements** — Line numbers, filename headers, word wrap toggle
- 🤖 **Cron Jobs Panel** (Beta) — Visual cron job manager with execution history
- 🔗 **Smart File Links** — Bare filenames clickable in chat (35+ extensions)
- 📁 **Directory Navigation** — Click directory paths to open File Explorer
- ✏️ **Open in Editor** — File preview has "Open in Editor" button

### Fixed
- Code block rendering (Shiki syntax highlighting)
- Inline file preview after refactor
- File link click crash (nested buttons)
- Horizontal overflow on long content

### Performance
- ⚡ Search optimization — batched requests, progressive results, AbortController
- Overflow hardening across chat, header, sidebar, messages

## [1.3.2] - 2026-02-09

### Added
- 🧠 **Thinking Level Toggle** — Select reasoning depth (off/low/medium/high) per message
- 🔌 **Multi-Provider LLM Features** — Smart Titles & Follow-ups support OpenAI, OpenRouter, Ollama, Custom
- ⚙️ **Settings Sidebar Layout** — Desktop-friendly tabbed navigation
- 🎙️ **Voice Tab** — Merged TTS and STT into single settings section
- 🚀 **Release Automation** — Tag push triggers npm + GitHub Packages + Release

### Changed
- LLM features enabled by default
- Increased token limits for reasoning models
- Added `OPENROUTER_API_KEY` server-side support

### Performance
- Search optimization — batched requests, AbortController cleanup
