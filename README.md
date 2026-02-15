# OpenCami 🦎

**Version 1.7.0**

A beautiful web client for [OpenClaw](https://github.com/openclaw/openclaw).

[![npm](https://img.shields.io/npm/v/opencami)](https://www.npmjs.com/package/opencami)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![OpenCami Chat Interface](docs/screenshots/opencami-chat.jpg)

## Quick Start

```bash
curl -fsSL https://opencami.xyz/install.sh | bash
```

Or via npm:

```bash
npm install -g opencami
opencami
```

Opens your browser to the chat interface.

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--port` | Port to serve on | `3000` |
| `--gateway` | OpenClaw gateway URL | `ws://127.0.0.1:18789` |
| `--host` | Bind address | `localhost` |
| `--no-open` | Don't open browser | — |

### Docker

```bash
docker build -t opencami .
docker run -p 3000:3000 opencami
```

## Features

### 💬 Chat & Communication
- ⚡ **Real-time streaming** — persistent WebSocket + SSE, token-by-token
- 📎 **File attachments** — upload PDFs, text, code, CSV, JSON via attach button or drag & drop (`/uploads/` + `read` tool workflow)
- 📄 **File cards** — uploaded files render as clickable cards (filename, icon, size) and open in File Explorer
- 🖼️ **Image attachments** — drag & drop with compression (images stay Base64 for vision)
- 🔊 **Voice playback (TTS)** — ElevenLabs → OpenAI → Edge TTS fallback
- 🎤 **Voice input (STT)** — ElevenLabs Scribe → OpenAI Whisper → Browser
- 🔔 **Browser notifications** — background tab alerts when assistant replies

### 🧠 Smart Features
- 🏷️ **Smart titles** — LLM-generated session titles
- 💡 **Smart follow-ups** — contextual suggestions after each response
- 🧠 **Thinking level toggle** — reasoning depth (off/low/medium/high) per message
- 🔎 **Search sources badge** — see which search engines were used
- 📊 **Context window meter** — visual token usage indicator

### 🔧 Workspace
- 📂 **File explorer** — browse & edit 30+ file types with built-in editor
- 🧠 **Memory viewer** — browse and edit MEMORY.md and daily memory files
- 🤖 **Agent manager** — create, edit, delete agents from the sidebar
- 🧩 **Skills browser** — discover and install skills from ClawHub
- ⏰ **Cron jobs panel** — manage scheduled automations
- 🔧 **Workspace settings** — toggle each tool on/off in Settings

### 🎨 Customization
- 🎨 **Model selector** — switch AI models per message
- 🎭 **Persona picker** — 20 AI personalities
- 🦎 **Chameleon theme** — light/dark/system with accent colors
- 🔤 **Text size** — S / M / L / XL
- 🔌 **Multi-provider LLM** — OpenAI, OpenRouter, Ollama, or custom

### 📁 Organization
- 📁 **Session folders** — grouped by kind (chats, subagents, cron, other)
- 📌 **Pin sessions** — pinned always on top
- 🗑️ **Bulk delete** — select multiple sessions, delete at once
- 🛡️ **Protected sessions** — prevent accidental deletion
- 📥 **Export** — Markdown, JSON, or plain text

### 📱 Platform
- 📱 **PWA** — installable, offline shell, auto-update
- 🖥️ **Tauri desktop app** (Beta) — native wrapper for macOS/Windows/Linux
- ⌨️ **Keyboard shortcuts** — full power-user navigation
- 💬 **Slash commands** — inline help and actions
- 🔍 **Conversation search** — current (⌘F) and global (⌘⇧F)

## Development

```bash
git clone https://github.com/robbyczgw-cla/opencami.git
cd opencami
npm install
cp .env.example .env.local
npm run dev
```

Then open the URL printed by Vite in your terminal.

> Dev port notes: this repo's `npm run dev` script uses port `3002`. If you run Vite directly with the config default, it targets `3003` and auto-falls back to the next free port.

## 🖥️ Desktop App (Tauri)

> **Note:** The desktop app is experimental and under active development. The primary focus of OpenCami is the **web app**. Native builds (desktop & mobile) are secondary.

OpenCami can also run as a native macOS/Windows/Linux desktop wrapper built with Tauri v2. The app loads your self-hosted OpenCami web instance.

### Prerequisites

- Node.js 18+
- Rust toolchain (`rustup`)

### Build

```bash
# Install dependencies (if not already done)
npm install

# Build web assets first
npm run build

# Build desktop app
npm run tauri:build
```

### Custom Gateway URL

By default, the desktop app connects to `http://localhost:3003`.

To override at build time:

```bash
OPENCAMI_REMOTE_URL="https://your-server.example.com" npm run tauri:build
```

### Output

Built installers/bundles are written to `src-tauri/target/release/bundle/`:
- macOS: `.app`, `.dmg`
- Windows: `.exe`, `.msi`
- Linux: `.deb`, `.AppImage`

### Desktop Features

- Tray icon (hide to tray on close)
- Native notifications
- Auto-start on login
- Custom titlebar
- Multiple windows (⌘N)
- Clipboard integration

### Dev Mode

```bash
npm run tauri:dev
```

Requires a display/GUI environment.

## Documentation

- [Features](docs/features.md)
- [Desktop App (Tauri)](docs/desktop-app.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [FAQ](docs/faq.md)
- [Contributing](docs/contributing.md)
- [Changelog](https://github.com/robbyczgw-cla/opencami/blob/main/CHANGELOG.md)

## Credits

Built on top of [WebClaw](https://github.com/ibelick/webclaw) by [@ibelick](https://github.com/ibelick).

File Explorer by [@balin-ar](https://github.com/balin-ar) ([PR #2](https://github.com/ibelick/webclaw/pull/2)).

Dockerfile by [@deblanco](https://github.com/deblanco) ([PR #7](https://github.com/ibelick/webclaw/pull/7)).

Powered by [OpenClaw](https://github.com/openclaw/openclaw).

## Links

- 🌐 [opencami.xyz](https://opencami.xyz)
- 📦 [npm](https://www.npmjs.com/package/opencami)
- 💻 [GitHub](https://github.com/robbyczgw-cla/opencami)

## License

[MIT](LICENSE)
