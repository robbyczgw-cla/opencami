# OpenCami 🦎

**Version 1.6.0**

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

⚡ **Real-time streaming** — persistent WebSocket + SSE, token-by-token\
🔍 **Conversation search** — current session (⌘F) and global (⌘⇧F)\
🔊 **Voice playback (TTS)** — ElevenLabs → OpenAI → Edge TTS fallback chain\
🎤 **Voice input (STT)** — ElevenLabs Scribe → OpenAI Whisper → Browser Web Speech API\
🔧 **TTS/STT provider selection** — choose provider and voice in Settings\
🔧 **Workspace Settings** — Unified toggles for Files, Memory, Agents, Skills & Cron Jobs\
📂 **File explorer** — 30+ file types, built-in editor, path jailing\
🎭 **Persona picker** — 20 personas, integrated with the personas skill\
🤖 **Agent manager** — sidebar panel for managing agents\
🎨 **Model selector** — switch models on the fly\
🏷️ **Smart titles** — LLM-generated session titles\
🧠 **Thinking level toggle** — Select reasoning depth (off/low/medium/high) per message\
🔌 **Multi-provider LLM** — Smart features via OpenAI, OpenRouter, Ollama, or custom provider\
💡 **Smart follow-ups** — contextual suggestions after each response\
🖼️ **Image attachments** — with compression for the 512KB WS limit\
🔎 **Search sources badge** — expandable badge with favicons for search results\
📁 **Session folders** — grouped by kind (chats, subagents, cron, other)\
📌 **Pin sessions** — pinned always on top\
📥 **Export** — Markdown, JSON, or plain text\
🔤 **Text size** — S / M / L / XL\
🦎 **Chameleon theme** — adaptive color scheme\
📱 **PWA** — installable, offline shell, auto-update\
⌨️ **Keyboard shortcuts** — full keyboard navigation\
💬 **Slash commands** — inline help and actions

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
