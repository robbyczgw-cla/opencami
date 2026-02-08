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
| `--port` | Port to serve on | `3001` |
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
🔊 **Voice playback** — ElevenLabs → OpenAI → Edge TTS fallback chain\
📂 **File explorer** — 30+ file types, built-in editor, path jailing\
🎭 **Persona picker** — 20 personas, integrated with the personas skill\
🎨 **Model selector** — switch models on the fly\
🏷️ **Smart titles** — LLM-generated session titles\
💡 **Smart follow-ups** — contextual suggestions after each response\
🖼️ **Image attachments** — with compression for the 512KB WS limit\
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

## Documentation

- [Features](docs/features.md)
- [Architecture](docs/architecture.md)
- [Deployment](docs/deployment.md)
- [Contributing](docs/contributing.md)
- [Changelog](docs/changelog.md)

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
