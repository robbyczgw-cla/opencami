# OpenCami 🦎

A feature-rich web client for [OpenClaw](https://github.com/openclaw/openclaw) — forked from [WebClaw](https://github.com/ibelick/webclaw) with additional productivity features.

![OpenCami](https://img.shields.io/badge/OpenClaw-Web_Client-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square)

## ✨ Features

### Core (inherited from WebClaw)
- 🌐 Modern React + Vite web interface
- 🔌 WebSocket connection to OpenClaw Gateway
- 💬 Real-time streaming chat
- 🎨 Clean, responsive design with dark/light mode
- 📱 Mobile-friendly

### New in OpenCami
- 🤖 **Dynamic Model Selector** — Switch between all configured models (Claude, GPT, Grok, etc.)
- 💡 **Smart Follow-ups** — Contextual suggestion buttons after each response
- ⌨️ **Keyboard Shortcuts** — Power-user navigation
- 📤 **Conversation Export** — Download chats as Markdown, JSON, or plain text
- 🗑️ **Safe Delete** — Sessions are soft-deleted (recoverable)

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | New conversation |
| `⌘/` / `Ctrl+/` | Focus input |
| `Esc` | Close modal/sidebar |
| `⌘⇧C` / `Ctrl+Shift+C` | Copy last response |
| `?` | Show help |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Running OpenClaw Gateway

### Installation

```bash
git clone https://github.com/robbyczgw-cla/opencami.git
cd opencami
npm install
```

### Configuration

Create `.env.local`:

```env
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=your_token_here
```

Or set environment variables directly.

### Run

```bash
npm run dev
```

Open `http://localhost:3001`

## 🔧 Production Setup (systemd)

```bash
sudo tee /etc/systemd/system/opencami.service << 'EOF'
[Unit]
Description=OpenCami - Web Client for OpenClaw
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/opencami
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=5
Environment=NODE_ENV=development
Environment=CLAWDBOT_GATEWAY_TOKEN=your_token_here

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now opencami
```

## 🔒 Secure Access with Tailscale

For secure remote access without exposing ports:

```bash
# Serve OpenCami via Tailscale HTTPS
tailscale serve --https=3001 --bg http://127.0.0.1:3001
```

Access via: `https://your-machine.tail-xxx.ts.net:3001`

## 📊 API Endpoints

OpenCami adds these server-side API routes:

| Endpoint | Description |
|----------|-------------|
| `GET /api/models` | List available models from Gateway config |
| `POST /api/follow-ups` | Generate contextual follow-up suggestions |

## 🛠️ Tech Stack

- **Framework:** React 19 + TanStack Router
- **Build:** Vite 7
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Backend:** TanStack Start (SSR)

## 🤝 Contributing

PRs welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

---

## 📜 Credits & Attribution

### Original Project: WebClaw

OpenCami is a **fork** of [WebClaw](https://github.com/ibelick/webclaw), an excellent open-source web client for OpenClaw created by **[@ibelick](https://github.com/ibelick)** (Julien Thibeaut).

We are deeply grateful for the original work that made this project possible.

#### What Comes From WebClaw (Original)

| Category | Components |
|----------|------------|
| **Core Architecture** | TanStack Start/Router setup, Vite config, React 19 integration |
| **UI Components** | Button, Menu, Dialog, PromptInput, ChatMessage, ThemeToggle |
| **Chat System** | Chat screen, message streaming, history management, WebSocket handling |
| **Gateway Client** | RPC client, authentication, connection management |
| **Styling** | Tailwind config, theming system, responsive design |
| **Routes** | Root layout, session routing, connection flow |

#### What's New in OpenCami

| Feature | Description |
|---------|-------------|
| **Model Selector** | Dynamic dropdown to switch AI models |
| **Command Help** | Slash command reference panel |
| **Keyboard Shortcuts** | Power-user navigation (⌘K, ⌘/, etc.) |
| **Conversation Export** | Download as Markdown/JSON/Text |
| **Follow-up Suggestions** | Contextual next-question buttons |
| **API Routes** | `/api/models`, `/api/follow-ups` |

For a complete breakdown of attribution, see **[CREDITS.md](CREDITS.md)**.

### License

Both WebClaw and OpenCami are released under the **MIT License**.

```
Copyright (c) 2025 Julien Thibeaut (WebClaw)
Copyright (c) 2026 robbyczgw-cla (OpenCami additions)
```

See [LICENSE](LICENSE) for full text.

---

## 🙏 Acknowledgments

- **[@ibelick](https://github.com/ibelick)** — Creator of WebClaw. Thank you for the clean codebase and modern architecture!
- **[OpenClaw](https://github.com/openclaw/openclaw)** — The AI assistant platform this client connects to
- **[TanStack](https://tanstack.com/)** — For Router and Start frameworks
- **[Tailwind CSS](https://tailwindcss.com/)** — For the styling system
- **[Radix UI](https://www.radix-ui.com/)** — For accessible component primitives

---

Made with 🦎 by [@robbyczgw-cla](https://github.com/robbyczgw-cla)

*If you find this useful, please star both [OpenCami](https://github.com/robbyczgw-cla/opencami) and the original [WebClaw](https://github.com/ibelick/webclaw)!*
