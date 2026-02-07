# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-07

### Added
- **Sidebar Swipe Gestures** — Swipe right from left edge to open, swipe left to close, dark backdrop overlay
- **Native Android APK** — Capacitor-based native shell with app icons, splash screen, status bar integration
- **Performance Optimizations** — Lazy-loaded dialogs/routes, content-visibility for off-screen messages, ~16% bundle reduction
- **Context Window Meter** — Visual token usage bar in chat header (green/yellow/red, pulse at 95%+)

### Fixed
- Android status bar overlapping header/sidebar (safe-area insets)

## [1.0.0] - 2026-02-06

### Added
- **PWA Support** — Full Progressive Web App with offline support, install to home screen
- **Voice Playback (TTS)** — Multi-provider text-to-speech (ElevenLabs, OpenAI TTS, Edge TTS)
- **Persona Picker** — Switch between 20 AI personalities on the fly
- **Model Selector** — Switch AI models per message
- **Image Attachments** — Upload and send images with auto-compression
- **Conversation Search** — Local (⌘F) and global (⌘⇧F) search
- **Smart Session Titles** — AI-generated titles with LLM
- **Smart Follow-ups** — Context-aware suggestions for next questions
- **Chameleon Theme** — Nature-inspired color scheme
- **Keyboard Shortcuts** — Power-user navigation (⌘K, ⌘F, ⌘⇧F, etc.)
- **Conversation Export** — Export to Markdown, JSON, or plain text
- **Real-Time Streaming** — Persistent WebSocket + SSE for token-by-token responses
- **File Explorer** — Browse and edit files with built-in text editor
- **Session Folders** — Organized sidebar with collapsible groups (Chats, Sub-agents, Cron, Other)
- **Pin Sessions** — Keep important sessions at the top
- **Text Size Control** — Adjustable chat text (S/M/L/XL)
- **Bulk Session Delete** — Select and delete multiple sessions at once
- **Protected Sessions** — Auto-protect main and channel-bound sessions from deletion
- **Slash Command Help** — Built-in `/help` command

### Changed
- Forked from [WebClaw](https://github.com/ibelick/webclaw) v0.1.0
- Upgraded TanStack ecosystem (Router, Query, Start)
- Enhanced mobile responsiveness

### Security
- Path jailing for file explorer with symlink escape protection
- Token-based Gateway authentication (never exposed to browser)
- Markdown sanitization (XSS prevention)

## [Unreleased]

### Planned
- 🔔 Push Notifications (PWA)
- 🎤 Voice Input (Whisper transcription)
- 📎 File Uploads (PDFs, docs, code)
- 📊 Usage Dashboard
- 🐳 Official Docker image

---

[1.0.0]: https://github.com/robbyczgw-cla/opencami/releases/tag/v1.0.0
