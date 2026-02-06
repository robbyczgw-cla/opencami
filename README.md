# OpenCami 🦎

> **Web chat client for [OpenClaw](https://github.com/openclaw/openclaw)** — AI chat interface with PWA support, smart titles, voice playback & more.

Forked from [WebClaw](https://github.com/ibelick/webclaw).

[![OpenCami](https://img.shields.io/badge/OpenCami-🦎-green)](https://opencami.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![OpenCami Chat Interface](docs/screenshots/opencami-chat.jpg)

## ✨ Features

### Core (from WebClaw)
- 💬 Multi-session chat with sidebar
- 🎨 Theme support (light/dark/system)
- ⚙️ Settings dialog
- 📝 Markdown rendering with syntax highlighting
- 📱 Mobile-responsive design

### OpenCami Additions

#### 📱 PWA — Install as App
Full Progressive Web App support for Android & iOS:
- **Install to Home Screen** — native app feel, no browser chrome
- **Offline Support** — cached shell loads even without internet
- **Auto-Update** — service worker updates seamlessly in background
- **Smart Caching** — cache-first for assets, network-first for API calls
- Works on Android (Chrome) and iOS (Safari)

#### 🔊 Voice Playback (TTS)
Listen to AI responses with text-to-speech:
- 🔊 Speaker button on every AI message
- **Multi-provider with auto-fallback:**
  - 🥇 ElevenLabs (best quality, if configured)
  - 🥈 OpenAI TTS (if API key available)
  - 🥉 Edge TTS (free, always works, no API key needed)
- Play/stop controls with loading indicator
- Toggle on/off in Settings
- Reads TTS config directly from your OpenClaw Gateway

#### 🎭 Persona Picker
Switch between AI personalities on the fly:
- Integrates with the [Personas skill](https://www.clawhub.ai/robbyczgw-cla/personas)
- 20 expert personas across 7 categories (Dev, Chef Marco, Dr. Med...)
- One click to activate — sends `/persona` commands through chat
- Active persona indicator on the picker button
- Auto-detects if skill is installed
- Toggle on/off in Settings (with ClawHub install link when skill missing)

#### 🎨 Model Selector
Switch AI models on the fly:
- Dropdown in chat composer showing all configured models
- Reads available models from Gateway config
- Per-message model override sent to Gateway
- Remembers your selection

#### 🖼️ Image Attachments
Upload and send images directly in chat:
- Drag & drop, clipboard paste, or file picker
- Auto-compression (fits 512KB WebSocket limit)
- Supports PNG, JPG, GIF, WebP (max 10MB input)
- Preview before sending

#### 🔍 Conversation Search
Find anything across all your conversations:
- `⌘F` — Search current conversation
- `⌘⇧F` — Global search across all sessions
- Instant results with highlighted matches

#### 🏷️ Smart Session Titles
AI-generated titles that actually describe your conversations:
- Powered by LLM (gpt-4.1-nano with fallback chain)
- Replaces generic "Feb 5 - hello..." titles
- Heuristic fallback when LLM is disabled

#### 💡 Smart Follow-ups
Context-aware suggestions for what to ask next:
- Instant heuristic suggestions appear immediately
- LLM analyzes context in background for smarter suggestions
- One click to send any suggestion
- Seamless transition from heuristic → AI suggestions

#### 🦎 Chameleon Theme
Nature-inspired color scheme — because why not 🌿

#### ⌨️ Keyboard Shortcuts
Power-user navigation:

| Shortcut | Action |
|----------|--------|
| `⌘K` | New chat |
| `⌘/` | Focus input |
| `⌘F` | Search current chat |
| `⌘⇧F` | Global search |
| `⌘⇧C` | Copy last response |
| `Esc` | Close dialogs |
| `?` | Show shortcuts help |

#### 📥 Conversation Export
Export any conversation in the format you need:
- 📝 Markdown (.md)
- 📋 JSON (.json)
- 📄 Plain Text (.txt)

#### ⚡ Real-Time Streaming
Watch AI responses appear token by token:
- Persistent WebSocket connection to Gateway
- Server-Sent Events (SSE) forward deltas to browser
- Smooth text appearance as the model generates
- Tool call indicators during processing
- Fast-polling fallback for resilience

#### 📂 File Explorer
Browse and edit files directly in the browser:
- Sidebar navigation with breadcrumb trail
- Upload, download, rename, delete files and folders
- Built-in text editor for 30+ file types (yaml, json, md, py, js, etc.)
- Right-click context menu
- Path jailing with symlink escape protection (`FILES_ROOT` env var)
- Ctrl+S to save, Esc to close editor

*Based on [balin-ar's PR](https://github.com/ibelick/webclaw/pull/2) — thank you! 🙏*

#### 📁 Session Folders
Organized sidebar with collapsible groups:
- 💬 **Chats** — always expanded at the top
- 🤖 **Sub-agents** — collapsed with count badge
- ⏰ **Cron / Isolated** — collapsed
- 📁 **Other** — collapsed
- Session kind auto-detected from session key pattern
- Folder open/close state persisted in localStorage

#### 📌 Pin Sessions
Keep important sessions at the top:
- Pin/unpin from session context menu
- 📌 icon on pinned sessions
- Pinned sessions always appear above folders

#### 🔤 Text Size
Adjust chat text to your preference:
- S / M / L / XL options in Settings
- Applies to all messages instantly
- Persisted in localStorage

#### 🗑️ Bulk Session Delete
Clean up old sessions fast:
- **Select** button in sidebar header toggles selection mode
- Click sessions to select/deselect (custom checkboxes)
- **Select All** / **Delete Selected** / **Cancel** action bar
- Concurrent deletion (max 10 parallel) for speed
- Confirmation dialog before deleting
- Sessions are archived (not permanently destroyed)

#### 💬 Slash Commands
Built-in `/help` shows available commands

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

### 📱 Install as PWA
1. Open OpenCami in your browser
2. **Android:** Tap ⋮ menu → "Install app" or "Add to Home Screen"
3. **iOS:** Tap Share → "Add to Home Screen"

## ⚙️ Configuration

### Gateway Connection
Create `.env.local`:
```bash
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=YOUR_TOKEN_HERE
```

### LLM Features (Optional)
1. Go to Settings (⚙️)
2. Enable "Smart Titles" and/or "Smart Follow-ups"
3. API key options:
   - Set `OPENAI_API_KEY` environment variable (recommended)
   - Or enter manually in Settings

Model fallback chain: `gpt-4.1-nano → gpt-4o-mini → gpt-3.5-turbo`

### File Explorer (Optional)
Set a root directory for the file explorer:
```bash
FILES_ROOT=/path/to/your/workspace
```
Access via the sidebar link or navigate to `/files`.

### Voice Playback (Optional)
TTS works out of the box with Edge TTS (free, no setup). For higher quality:
- **ElevenLabs:** Configure `messages.tts.elevenlabs.apiKey` in your OpenClaw config
- **OpenAI:** Set `OPENAI_API_KEY` environment variable

### Persona Picker (Optional)
Install the [Personas skill](https://www.clawhub.ai/robbyczgw-cla/personas) on your OpenClaw instance:
```bash
clawhub install personas
```
The picker will automatically appear in the chat composer.

## 🔄 Upstream Contributions

PRs submitted to [ibelick/webclaw](https://github.com/ibelick/webclaw):
- ✅ [PR #1](https://github.com/ibelick/webclaw/pull/1) — Locale fix (MERGED)
- ⏳ [PR #4](https://github.com/ibelip/webclaw/pull/4) — Image attachments (pending)

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
