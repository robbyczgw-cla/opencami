# OpenCami 🦎

> **Web chat client for [OpenClaw](https://github.com/openclaw/openclaw)** — AI chat interface with PWA support, smart titles, voice playback & more.

Forked from [WebClaw](https://github.com/ibelick/webclaw).

[![OpenCami](https://img.shields.io/badge/OpenCami-🦎-green)](https://opencami.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![OpenCami Chat Interface](docs/screenshots/opencami-chat.jpg)

## ✨ Features

**Core:**
💬 Multi-session chat · 🎨 Theme support · ⚙️ Settings dialog · 📝 Markdown rendering · 📱 Mobile-responsive

**Communication:**
⚡ Real-time streaming · 🔊 Voice playback (TTS)

**Organization:**
📁 Session folders · 🦎 OpenCami chat folder · 📌 Pin sessions · 🗑️ Bulk delete · 🛡️ Protected sessions

**Search & Navigation:**
🔍 Conversation search · ⌨️ Keyboard shortcuts · 📥 Export conversations

**Customization:**
🎨 Model selector · 🎭 Persona picker · 🦎 Chameleon theme · 🔤 Text size control

**Files:**
📂 File explorer · 🖼️ Image attachments

**Smart Features:**
🏷️ Smart titles · 💡 Smart follow-ups · 💬 Slash commands

**Mobile:**
👉 Swipe gestures · ⚡ Lazy loading · 📱 Native Android APK (Capacitor)

**PWA:**
📱 Install as app · 🔄 Offline support · 🚀 Auto-update

→ **[See detailed feature descriptions in docs/features.md](docs/features.md)**

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/robbyczgw-cla/opencami.git
cd opencami

# Install
npm install

# Configure
cp .env.example .env.local
# Edit .env.local with your Gateway URL and token

# Run
npm run dev
```

Open http://localhost:3001

## 📱 Install as PWA

1. Open OpenCami in your browser
2. **Android:** Tap ⋮ menu → "Install app" or "Add to Home Screen"
3. **iOS:** Tap Share → "Add to Home Screen"

## 📚 Documentation

- **[Features](docs/features.md)** — Detailed feature descriptions
- **[Architecture](docs/architecture.md)** — Technical overview
- **[Deployment](docs/deployment.md)** — Self-hosting guide
- **[Contributing](docs/contributing.md)** — Development workflow
- **[Changelog](docs/changelog.md)** — Version history

## 🔄 Upstream Contributions

PRs submitted to [ibelick/webclaw](https://github.com/ibelick/webclaw):
- ✅ [PR #1](https://github.com/ibelick/webclaw/pull/1) — Locale fix (MERGED)
- ⏳ [PR #4](https://github.com/ibelick/webclaw/pull/4) — Image attachments
- ⏳ [PR #9](https://github.com/ibelick/webclaw/pull/9) — Conversation search
- ⏳ [PR #10](https://github.com/ibelick/webclaw/pull/10) — Conversation export
- ⏳ [PR #11](https://github.com/ibelick/webclaw/pull/11) — Text size setting

## 🗺️ Roadmap

- [x] 🔊 Voice Playback (multi-provider TTS)
- [x] 🎭 Persona Picker
- [x] 🎨 Model Selector
- [x] 📱 PWA Support
- [x] ⚡ Real-Time Streaming
- [x] 📂 File Explorer
- [ ] 🔔 Push Notifications (PWA)
- [ ] 🎤 Voice Input (Whisper transcription)
- [ ] 📎 File Uploads (PDFs, docs, code)
- [ ] 📊 Usage Dashboard

## 🙏 Credits

- **[WebClaw](https://github.com/ibelick/webclaw)** by [Julien Thibeaut](https://github.com/ibelick) — Original project
- **[balin-ar](https://github.com/balin-ar)** — File Explorer with built-in text editor ([PR #2](https://github.com/ibelick/webclaw/pull/2))
- **[OpenClaw](https://github.com/openclaw/openclaw)** — The gateway that powers it all

## 📄 License

MIT — See [LICENSE](LICENSE)

---

🌐 **[opencami.xyz](https://opencami.xyz)** · Built with 💚 by the OpenCami community
