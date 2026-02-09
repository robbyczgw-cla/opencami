# Features

## Core (from WebClaw)

### 💬 Multi-session Chat
- Sidebar with all conversations
- Create and switch between multiple chat sessions
- Session management with context menu

### 🎨 Theme Support
- Light, dark, and system-auto themes
- Smooth transitions between themes
- Persisted preference across sessions

### ⚙️ Settings Dialog
- Centralized configuration panel
- Toggle features on/off
- API key management

### 📝 Markdown Rendering
- Full markdown support with syntax highlighting
- Code blocks with language detection
- Tables, lists, headers, and inline formatting

### 📱 Mobile-Responsive Design
- Optimized for phones and tablets
- Touch-friendly interface
- Collapsible sidebar on mobile

## Communication

### ⚡ Real-Time Streaming
Watch AI responses appear token by token:
- **Persistent WebSocket connection** to OpenClaw Gateway
- **Server-Sent Events (SSE)** forward deltas to browser
- Smooth text appearance as the model generates
- Tool call indicators during processing
- Fast-polling fallback for resilience

### 🔊 Voice Playback (TTS)
Listen to AI responses with text-to-speech:
- 🔊 Speaker button on every AI message
- **Multi-provider with auto-fallback:**
  - 🥇 **ElevenLabs** (best quality, if configured)
  - 🥈 **OpenAI TTS** (if API key available)
  - 🥉 **Edge TTS** (free, always works, no API key needed)
- Play/stop controls with loading indicator
- Toggle on/off in Settings
- Reads TTS config directly from your OpenClaw Gateway

### 🎤 Voice Input (STT)
Dictate messages with speech-to-text:
- 🎤 Microphone button in chat composer
- **Multi-provider with auto-fallback:**
  - 🥇 **ElevenLabs Scribe v2** (best quality, if configured)
  - 🥈 **OpenAI Whisper** (if API key available)
  - 🥉 **Browser Web Speech API** (free, no server needed)
- Recording UI with timer, pulse animation, and stop button
- Auto-stop at 120 seconds
- Transcribed text inserted into composer — edit before sending
- Provider selection in Settings

### 🔧 TTS/STT Provider Settings
Fine-tune your voice experience:
- **TTS Provider:** Auto / ElevenLabs / OpenAI / Edge TTS (free)
- **STT Provider:** Auto / ElevenLabs / OpenAI / Browser (free)
- **Voice selection:** OpenAI voices (alloy/echo/fable/onyx/nova/shimmer)
- All preferences stored locally

### 🤖 Agent Manager
Manage your AI agents from the sidebar:
- CRUD operations for agents
- Configuration enrichment
- Sidebar panel integration

### 🔎 Search Sources Badge
See where search results come from:
- Expandable badge on search-enhanced messages
- Favicons for each source
- Toggle visibility in Settings

## Organization

### 📁 Session Folders
Organized sidebar with collapsible groups:
- 💬 **Chats** — always expanded at the top
- 🤖 **Sub-agents** — collapsed with count badge
- ⏰ **Cron / Isolated** — collapsed
- 📁 **Other** — collapsed
- Session kind auto-detected from session key pattern
- Folder open/close state persisted in localStorage

### 📌 Pin Sessions
Keep important sessions at the top:
- Pin/unpin from session context menu
- 📌 icon on pinned sessions
- Pinned sessions always appear above folders

### 🗑️ Bulk Session Delete
Clean up old sessions fast:
- **Select** button in sidebar header toggles selection mode
- Click sessions to select/deselect (custom checkboxes)
- **Select All** / **Delete Selected** / **Cancel** action bar
- Concurrent deletion (max 10 parallel) for speed
- Confirmation dialog before deleting
- Sessions are archived (not permanently destroyed)

### 🛡️ Protected Sessions
Automatic deletion protection for critical sessions:
- **Main session** (`agent:main:main`) is always protected
- **Channel-bound sessions** are automatically protected:
  - Telegram (`:telegram:`)
  - Discord (`:discord:`)
  - Signal (`:signal:`)
  - WhatsApp (`:whatsapp:`)
  - Slack (`:slack:`)
  - iMessage (`:imessage:`)
- Protected sessions cannot be deleted from the UI
- Prevents accidental deletion of active integrations
- Sessions are archived, not permanently destroyed

## Search & Navigation

### 🔍 Conversation Search
Find anything across all your conversations:
- **⌘F** — Search current conversation
- **⌘⇧F** — Global search across all sessions
- Instant results with highlighted matches

### ⌨️ Keyboard Shortcuts
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

### 📥 Conversation Export
Export any conversation in the format you need:
- 📝 **Markdown** (.md)
- 📋 **JSON** (.json)
- 📄 **Plain Text** (.txt)

## Customization

### 🎨 Model Selector
Switch AI models on the fly:
- Dropdown in chat composer showing all configured models
- Reads available models from Gateway config
- Per-message model override sent to Gateway
- Remembers your selection

### 🎭 Persona Picker
Switch between AI personalities on the fly:
- Integrates with the [Personas skill](https://www.clawhub.ai/robbyczgw-cla/personas)
- 20 expert personas across 7 categories (Dev, Chef Marco, Dr. Med...)
- One click to activate — sends `/persona` commands through chat
- Active persona indicator on the picker button
- Auto-detects if skill is installed
- Toggle on/off in Settings (with ClawHub install link when skill missing)

### 🦎 Chameleon Theme
Nature-inspired color scheme — because why not 🌿

### 🔤 Text Size
Adjust chat text to your preference:
- S / M / L / XL options in Settings
- Applies to all messages instantly
- Persisted in localStorage

## Files

### 📂 File Explorer
Browse and edit files directly in the browser:
- **Sidebar navigation** with breadcrumb trail
- **Upload, download, rename, delete** files and folders
- **Built-in text editor** for 30+ file types (yaml, json, md, py, js, etc.)
- Right-click context menu
- **Path jailing** with symlink escape protection (`FILES_ROOT` env var)
- **Ctrl+S** to save, **Esc** to close editor

*Based on [balin-ar's PR](https://github.com/ibelick/webclaw/pull/2) — thank you! 🙏*

### 🖼️ Image Attachments
Upload and send images directly in chat:
- Drag & drop, clipboard paste, or file picker
- Auto-compression (fits 512KB WebSocket limit)
- Supports PNG, JPG, GIF, WebP (max 10MB input)
- Preview before sending

## Smart Features

### 🏷️ Smart Session Titles
AI-generated titles that actually describe your conversations:
- Powered by LLM (gpt-4.1-nano with fallback chain)
- Replaces generic "Feb 5 - hello..." titles
- Heuristic fallback when LLM is disabled

### 💡 Smart Follow-ups
Context-aware suggestions for what to ask next:
- Instant heuristic suggestions appear immediately
- LLM analyzes context in background for smarter suggestions
- One click to send any suggestion
- Seamless transition from heuristic → AI suggestions

### 💬 Slash Commands
Built-in `/help` shows available commands

## Mobile

### 👉 Gesture Navigation
Native-feeling touch gestures for mobile:
- **Swipe right from left edge** — opens sidebar (40px edge zone)
- **Swipe left on sidebar/backdrop** — closes sidebar
- **Dark backdrop overlay** — tap to dismiss sidebar
- **Direction lock** — no interference with vertical scrolling
- Desktop unaffected (touch events only)

### ⚡ Performance Optimizations
Lazy loading and render optimizations for snappy mobile UX:
- **Lazy-loaded dialogs** — Search, Shortcuts, Settings, Export load on demand
- **Lazy-loaded routes** — File Explorer loaded only when visited
- **content-visibility: auto** — browser skips rendering off-screen messages
- **Stable refs** — fewer re-renders in message list and sidebar
- **Bundle reduction** — main chunk reduced ~16% (242KB → 204KB)

### 📱 Native Android App (Capacitor)
Full native Android APK built with Capacitor:
- **Native shell** — loads OpenCami web app in a native WebView
- **Status bar integration** — transparent overlay with safe-area insets
- **Splash screen** — branded launch screen with OpenCami theme
- **App icons** — full icon set (hdpi to xxxhdpi) with adaptive icons
- **Keyboard handling** — body resize mode for chat UX
- **GitHub Actions** — automated APK build workflow
- Package: `com.opencami.app`

## Progressive Web App

### 📱 PWA — Install as App
Full Progressive Web App support for Android & iOS:
- **Install to Home Screen** — native app feel, no browser chrome
- **Offline Support** — cached shell loads even without internet
- **Auto-Update** — service worker updates seamlessly in background
- **Smart Caching** — cache-first for assets, network-first for API calls
- Works on Android (Chrome) and iOS (Safari)
