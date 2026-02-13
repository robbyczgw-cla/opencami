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

## 1.5.0 (2026-02-11)

### New Features
- 🖥️ **Tauri Desktop App** (Beta) — Native desktop wrapper with tray icon, notifications, auto-start, custom titlebar, multi-window support, and clipboard integration
- 🎨 **Appearance Overhaul** — Frost Light/Dark themes (glassmorphism), accent colors (7 options), font family selection, message density, chat width, sidebar width, and chat bubble style settings
- 📦 **ClawHub Skills Browser** (Beta) — Browse, search, and discover skills from ClawHub directly in the app. Includes skill detail view, security badges, Published/My Skills/Recommended tabs
- 📄 **FAQ** — Built-in FAQ page covering common questions

### Improvements
- ⚡ **Compact Settings** — Appearance tab uses inline layout for density/bubbles/width/sidebar/font, shorter labels
- 🎯 **Theme Labels** — System→Auto, Chameleon→Cham, Frost Light→Ice, Frost Dark→Noir
- 🔤 **Reduced Fonts** — Removed IBM Plex Sans, JetBrains Mono, Merriweather; kept System/Inter/Roboto/Garamond
- 📱 **Mobile Settings** — Fixed scroll (overflow-y-auto instead of hidden)
- 🎨 **Settings Polish** — Accent rings, font preview in tabs, hover effects, no emoji clutter

### Bug Fixes
- 🔧 **Streaming Race Condition** — Fixed crash when switching sessions during active stream
- 🗑️ **Bulk Delete Feedback** — Shows alert with failed sessions instead of silent failure
- 🔍 **Search Jump to Message** — Clicking search result scrolls to and highlights the message (1.8s animation)
- 🌙 **Frost Dark Theme** — Fixed CSS selectors (was only using media query, not .dark class), improved color palette contrast
- 📐 **Settings Dialog** — Wider dialog (860px), no horizontal scroll, consistent layout across all tabs

## 1.4.0 (2026-02-10)

### New Features
- 🧩 **Code Block Enhancements** — Line numbers (multi-line only, non-selectable), filename header from fence metadata (e.g. ` ```python app.py `), and word wrap toggle with persistent preference
- 🤖 **Cron Jobs Panel** (Beta) — Visual cron job manager: list, enable/disable, run-now, execution history. Enable via Settings → Beta Features. Based on [balin-ar/webclaw](https://github.com/balin-ar/webclaw) with bug fixes and hardening
- 🔗 **Smart File Links** — Bare filenames (e.g. `SOUL.md`, `app.py`) are now clickable in chat messages, not just full paths. Supports 35+ file extensions
- 📁 **Directory Navigation** — Clicking a directory path in chat navigates directly to the File Explorer
- ✏️ **Open in Editor** — File preview dialog now has an "Open in Editor" button alongside "Open in Explorer"

### Bug Fixes
- 🐛 **Code block rendering restored** — Fixed `createDefaultComponents()` overriding code block routing, which caused Shiki syntax highlighting to never render (fenced blocks appeared as plain text)
- 🐛 **Inline file preview restored** — Fixed `remarkFilePathLinks` plugin missing from markdown renderer after code block refactor
- 🐛 **File link click crash** — Fixed nested `<button>` elements causing full page reload when clicking file links
- 🐛 **Horizontal overflow** — Fixed long titles, code blocks, and messages pushing the entire page layout to the right

### Improvements
- 📐 **Overflow hardening** — Added defensive `overflow-x-hidden`, `min-w-0`, `max-w-full` across chat screen, header, sidebar, messages, code blocks, and chat container
- 📝 **Sidebar title truncation** — Long session titles now properly truncate with ellipsis instead of overflowing
- 🔍 **File path detection** — Improved regex to support dashed language names, directory paths, and bare filenames while avoiding false positives (version numbers, domains, IPs)

### Attribution
- Cron Jobs Panel inspired by and credited to [@balin-ar](https://github.com/balin-ar/webclaw) ([File Explorer PR #2](https://github.com/ibelick/webclaw/pull/2), Cron Dashboard from fork)

## 1.3.2 (2026-02-10)

### Performance
- ⚡ **Search optimization** — Global search now uses batched requests (max 10 parallel), progressive results, and AbortController for cancellation
- 🛡️ **AbortController cleanup** — All fetch calls (TTS, STT, Personas, Models, Files) now properly abort on unmount/navigation

### CI/CD
- 🚀 **Release automation** — Tag push triggers npm publish + GitHub Packages + GitHub Release with changelog

## 1.3.0 (2026-02-10)

### New Features
- 🧠 **Thinking Level Toggle** — Select reasoning depth (off/low/medium/high) per message in the chat composer
- 🔌 **Multi-Provider LLM Features** — Smart Titles & Follow-ups now support OpenAI, OpenRouter, Ollama (local), and Custom providers
- ⚙️ **Settings Sidebar Layout** — Desktop-friendly tabbed navigation with sidebar (mobile unchanged)
- 🎙️ **Voice Tab** — Merged Text-to-Speech and Speech-to-Text into a single "Voice" settings section

### Improvements
- LLM features (Smart Titles, Smart Follow-ups) now enabled by default
- Increased token limits for reasoning models (fixes empty responses with thinking models)
- Added `OPENROUTER_API_KEY` server-side support
- Backwards-compatible migration from `openaiApiKey` to `llmApiKey`
- Added codebase security/performance review (REVIEW.md)

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
