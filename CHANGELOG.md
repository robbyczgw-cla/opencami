# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-08

Initial npm release. Built on [webclaw](https://github.com/ibelick/webclaw) by [@ibelick](https://github.com/ibelick).

### Added

- Real-time token streaming (WebSocket + SSE fallback)
- Conversation search (⌘F current, ⌘⇧F global)
- File explorer with built-in editor (30+ file types)
- 20 switchable AI personas
- TTS voice playback (ElevenLabs → OpenAI → Edge TTS fallback)
- Export conversations (Markdown, JSON, TXT)
- PWA + Android APK with swipe gestures
- Context window meter
- Image attachments with compression
- Model selector
- LLM-generated smart titles
- Smart follow-up suggestions
- Session folders, pinning, bulk delete, protected sessions
- Keyboard shortcuts
- Chameleon theme
- CLI: `opencami` command with `--port`, `--gateway`, `--host`, `--no-open` flags
