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

## [1.2.0] - 2026-02-09

### Added
- **Voice Input (STT)** — Microphone button in chat composer with recording UI (timer, pulse animation, stop button)
  - **ElevenLabs Scribe v2** — highest quality transcription (if API key configured)
  - **OpenAI Whisper** — reliable fallback (if API key configured)
  - **Browser Web Speech API** — free client-side fallback, no server needed
  - Auto-stop at 120 seconds, visual recording feedback
  - Transcribed text inserted into composer for editing before send
- **TTS Provider Selection** — Choose between Auto / ElevenLabs / OpenAI / Edge TTS (free) in Settings
  - Voice selection dropdown for OpenAI (alloy/echo/fable/onyx/nova/shimmer)
- **STT Provider Selection** — Choose between Auto / ElevenLabs / OpenAI / Browser (free) in Settings
- **Search Sources Badge** — Expandable badge showing search sources with favicons, toggle in Settings
- **Agent Manager** — Sidebar panel for managing agents (CRUD, config enrichment)

### Changed
- Removed thinking-content from search results

### Fixed
- Various UI and performance fixes

## [1.1.0] - 2026-02-07

### Added
- Sidebar Swipe Gestures — swipe right from left edge to open, swipe left to close, dark backdrop overlay
- Native Android APK — Capacitor-based native shell with app icons, splash screen, status bar integration
- Performance Optimizations — lazy-loaded dialogs/routes, content-visibility for off-screen messages, ~16% bundle reduction
- Context Window Meter — visual token usage bar in chat header (green/yellow/red, pulse at 95%+)

### Fixed
- Android status bar overlapping header/sidebar (safe-area insets)

## [1.0.0] - 2026-02-06

### Added
- PWA Support — installable Progressive Web App with offline shell
- Voice Playback (TTS) — ElevenLabs/OpenAI/Edge TTS fallback chain
- Persona Picker — switch between 20 AI personalities
- Model Selector — per-message model override
- Image Attachments — upload and send images with compression
- Conversation Search — local (⌘F) and global (⌘⇧F)
- Smart Session Titles — LLM-generated titles
- Smart Follow-ups — context-aware suggestions
- Chameleon Theme
- Keyboard Shortcuts
- Conversation Export — Markdown/JSON/TXT
- Real-Time Streaming — persistent WebSocket + SSE
- File Explorer — browse and edit files in a jailed root
- Session Folders, Pin Sessions, Text Size Control, Bulk Session Delete, Protected Sessions
- Slash Command Help
- CLI `opencami` command with `--port`, `--gateway`, `--host`, `--no-open` flags

### Changed
- Forked from [WebClaw](https://github.com/ibelick/webclaw) v0.1.0
- Upgraded TanStack ecosystem (Router, Query, Start)
- Enhanced mobile responsiveness

### Security
- Path jailing for file explorer with symlink escape protection
- Token-based Gateway authentication (server-side)
- Markdown sanitization (XSS prevention)

## [Unreleased]

### Planned
- Push Notifications (PWA)
- File Uploads (PDFs/docs/code)
- Usage Dashboard
- Official Docker image

---

[1.2.0]: https://github.com/robbyczgw-cla/opencami/releases/tag/v1.2.0
[1.1.0]: https://github.com/robbyczgw-cla/opencami/releases/tag/v1.1.0
[1.0.0]: https://github.com/robbyczgw-cla/opencami/releases/tag/v1.0.0
