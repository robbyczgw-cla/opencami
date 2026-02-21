# Changelog

All notable changes to OpenCami are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [Semantic Versioning](https://semver.org/).

## [1.9.0] - 2026-02-21

### Added

- 🎨 **Artifacts Preview (Beta)** — Live HTML/SVG preview side panel. When AI generates HTML or SVG code, a "Preview" button appears in the code block toolbar. Click to open a sandboxed preview panel beside the chat. Enable via Settings → Workspace → "Artifacts Preview (Beta)".

## [1.8.1] - 2026-02-19

### Enhanced

- 📊 **Dashboard System Stats** — added Load Average (1m/5m/15m), Uptime, Network I/O (RX/TX), Top 5 Processes by CPU, CPU model + core count. Progress bars now color-coded (green/amber/red by usage).
- 🕐 **Dashboard Cron Jobs** — now shows all cron jobs (scrollable list), includes enabled/disabled visual state, and displays total job count in widget header.

## [1.8.0] - 2026-02-19

### Added

- 📊 **Dashboard Panel (Beta)** — New `/dashboard` route with three live widgets: System Stats (CPU, RAM, Disk with progress bars), Gateway Status (active sessions), and Cron Overview (up to 6 jobs with next run time and last status). Auto-refreshes every 10 seconds. Enable via Settings → "Dashboard (Beta)" toggle.

## [1.7.0] - 2026-02-15

### Added

- 📎 **File Attachments** — Upload PDFs, text files, code, CSVs, JSON, and more via attach button or drag & drop. Files uploaded via HTTP to `/uploads/`, agent reads them with `read` tool. Images still use Base64 inline for vision.
- 📄 **File Cards** — Uploaded files render as clickable cards in messages showing filename, icon, and size. Click to open in File Explorer.
- 🖱️ **Drag & Drop** — Drop files onto the composer: images → Base64 (vision), other files → HTTP upload.

### Fixed

- 🧊 **Ice theme** — Always renders as light theme now, regardless of system dark mode setting. CSS media queries and JS theme logic hardened to prevent dark override.
- 📊 **File info endpoint** — `/api/files/info` returns correct file size via `fs.stat()`
- 🎯 **File card false positives** — Regex tightened to only match at start of message, ignores code blocks and quotes.

## [1.6.1] - 2026-02-15

### Fixed

- 🔐 **Gateway scope compatibility** — Request full operator scopes (`operator.read`, `operator.write`, `operator.admin`) for OpenClaw v2026.2.14 compatibility. Without this, sessions and models fail to load.

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
