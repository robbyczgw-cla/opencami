# OpenCami 🦎

A beautiful web client for [OpenClaw](https://github.com/openclaw/openclaw) - Cami's personal interface.

## Features

- 🌐 Modern React-based web interface
- 🔌 WebSocket connection to OpenClaw Gateway
- 💬 Real-time chat with your AI assistant
- 🎨 Clean, responsive design
- 🔒 Secure (Tailscale-only access recommended)

## Setup

1. Create `.env.local` with your Gateway credentials:

```env
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=your_token_here
```

2. Install and run:

```bash
npm install
npm run dev
```

3. Open `http://localhost:3001` (or your Tailscale URL)

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAWDBOT_GATEWAY_URL` | OpenClaw Gateway WebSocket URL | `ws://127.0.0.1:18789` |
| `CLAWDBOT_GATEWAY_TOKEN` | Gateway authentication token | - |
| `CLAWDBOT_GATEWAY_PASSWORD` | Alternative: Gateway password | - |

## Credits

- Originally forked from [WebClaw](https://github.com/ibelick/webclaw) by [@ibelick](https://github.com/ibelick)
- Built for [OpenClaw](https://github.com/openclaw/openclaw)

## License

MIT License - see [LICENSE](LICENSE)
