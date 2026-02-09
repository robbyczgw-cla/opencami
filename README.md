# OpenCami 🦎

A beautiful web client for [OpenClaw](https://github.com/openclaw/openclaw).

```bash
npm install -g opencami
opencami
```

[![npm](https://img.shields.io/npm/v/opencami)](https://www.npmjs.com/package/opencami)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![OpenCami Chat Interface](docs/screenshots/opencami-chat.jpg)

## Quick Start

Install globally and run:

```bash
npm install -g opencami
opencami
```

That's it. Opens your browser to the chat interface.

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
📂 **File explorer** — 30+ file types, built-in editor, path jailing\
🎭 **Persona picker** — 20 personas, integrated with the personas skill\
🤖 **Agent manager** — sidebar panel for managing agents\
🎨 **Model selector** — switch models on the fly\
🏷️ **Smart titles** — LLM-generated session titles\
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

## Documentation

- [Features](docs/features.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Contributing](docs/contributing.md)
- [Changelog](CHANGELOG.md)

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
