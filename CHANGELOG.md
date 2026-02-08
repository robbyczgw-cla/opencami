# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Voice Input (Whisper transcription)
- File Uploads (PDFs/docs/code)
- Usage Dashboard
- Official Docker image

---

[1.1.0]: https://github.com/robbyczgw-cla/opencami/releases/tag/v1.1.0
[1.0.0]: https://github.com/robbyczgw-cla/opencami/releases/tag/v1.0.0
