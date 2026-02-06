# OpenCami 🦎

> **Web chat client for [OpenClaw](https://github.com/openclaw/openclaw)** — AI chat interface with PWA support, smart titles, follow-ups & more.

Forked from [WebClaw](https://github.com/ibelick/webclaw).

![OpenCami](https://img.shields.io/badge/OpenCami-🦎-green)

## ✨ Features

### Core (from WebClaw)
- 💬 Multi-session chat with sidebar
- 🎨 Theme support (light/dark/system)
- ⚙️ Settings dialog
- 📝 Markdown rendering with syntax highlighting
- 📱 Mobile-responsive design

### OpenCami Additions
- 🖼️ **Image Attachments** - Upload and send images with auto-compression (fits 512KB WebSocket limit)
- 🔍 **Conversation Search** - `⌘F` for current chat, `⌘⇧F` for global search
- ⌨️ **Keyboard Shortcuts** - Power-user navigation
- 📥 **Conversation Export** - Export as Markdown, JSON, or plain text
- 🎨 **Model Selector** - Switch models on the fly (UI ready)
- 🦎 **Chameleon Theme** - Nature-inspired color scheme
- 💬 **Slash Command Help** - `/help` shows available commands

### 🤖 LLM-Enhanced Features (NEW!)
- 🏷️ **Smart Session Titles** - AI-generated titles instead of "Feb 5 - hello..."
- 💡 **Smart Follow-ups** - Context-aware follow-up suggestions
- ⚙️ **Optional** - Heuristic fallback when disabled
- 🔑 **Uses OpenAI API** - gpt-4.1-nano (with fallback chain)

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/robbyczgw-cla/opencami.git
cd opencami

# Install
npm install

# Run (connects to OpenClaw Gateway on localhost:18789)
npm run dev
```

Open http://localhost:3000

## ⚙️ Configuration

### LLM Features
1. Go to Settings (⚙️)
2. Enable "Use LLM for session titles" and/or "Use LLM for follow-ups"
3. API key options:
   - Set `OPENAI_API_KEY` environment variable (recommended)
   - Or enter manually in settings

### Model Fallback Chain
```
gpt-4.1-nano → gpt-4o-mini → gpt-3.5-turbo
```
If one model is unavailable, automatically tries the next.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | New chat |
| `⌘/` | Focus input |
| `⌘F` | Search current chat |
| `⌘⇧F` | Global search |
| `⌘⇧C` | Copy last response |
| `Esc` | Close dialogs |
| `?` | Show shortcuts help |

## 🖼️ Image Attachments

- **Supported formats:** PNG, JPG, GIF, WebP
- **Max upload:** 10MB (auto-compressed to ~300KB)
- **Compression:** Client-side, fits 512KB WebSocket limit

## 🔄 Upstream Contributions

PRs submitted to [ibelick/webclaw](https://github.com/ibelick/webclaw):
- ✅ [PR #1](https://github.com/ibelick/webclaw/pull/1) - Locale fix (MERGED)
- ⏳ [PR #4](https://github.com/ibelick/webclaw/pull/4) - Image attachments (pending)

## 🙏 Credits

- **WebClaw** by [Julien Thibeaut](https://github.com/ibelick) - Original project
- **OpenClaw** - The gateway that powers it all

## 📄 License

MIT - See [LICENSE](LICENSE)

---

*Built with 💚 by the OpenCami community*
