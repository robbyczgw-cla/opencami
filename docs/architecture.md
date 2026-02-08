# Architecture

## Overview

OpenCami is a modern web client for OpenClaw, built with TanStack ecosystem and real-time streaming capabilities.

## Gateway Connection

### WebSocket Transport
- Persistent bidirectional connection to OpenClaw Gateway
- Default endpoint: `ws://127.0.0.1:18789`
- Configured via `CLAWDBOT_GATEWAY_URL` environment variable
- Auto-reconnect with exponential backoff

### Authentication
- Token-based auth via `CLAWDBOT_GATEWAY_TOKEN` environment variable
- Token sent in WebSocket handshake
- No cookies, no sessions — stateless design

## Real-Time Streaming

### Architecture
1. **Client → Server:** User sends message via WebSocket
2. **Server → Gateway:** Server forwards to OpenClaw Gateway
3. **Gateway → Server:** Streaming response (token-by-token deltas)
4. **Server → Client:** Server-Sent Events (SSE) forward deltas to browser

### Implementation
- **Persistent WebSocket** maintained by server
- **SSE endpoint** (`/api/chat/stream`) for browser
- **Token-by-token rendering** in React component
- **Tool call indicators** during agent processing
- **Fast-polling fallback** if SSE disconnects

## Session Management

### Session Keys
Sessions are identified by keys with semantic structure:
- `agent:main:main` — Main chat session
- `agent:main:subagent:<uuid>` — Sub-agent sessions
- `agent:main:cron:<name>` — Cron job sessions
- `agent:main:telegram:<id>` — Channel-bound sessions

### Session Kinds
Auto-detected from key pattern:
- `chat` — Regular conversations
- `subagent` — Spawned sub-agents
- `cron` — Scheduled tasks
- `other` — Everything else

### Protected Sessions
Certain sessions cannot be deleted:
- **Main session:** `agent:main:main`
- **Channel-bound sessions:** Contains `:telegram:`, `:discord:`, `:signal:`, `:whatsapp:`, `:slack:`, `:imessage:`
- Protection enforced in UI (delete button hidden)
- Sessions are archived on deletion, not permanently destroyed

## Tech Stack

### Frontend Framework
- **[Vite](https://vitejs.dev/)** — Fast build tool with HMR
- **[React 18](https://react.dev/)** — UI library with concurrent features
- **[TanStack Router](https://tanstack.com/router)** — Type-safe routing
- **[TanStack Start](https://tanstack.com/start)** — Full-stack React meta-framework

### Data & State
- **[TanStack Query](https://tanstack.com/query)** — Server state management
  - Caching & invalidation
  - Background refetching
  - Optimistic updates
- **localStorage** — UI preferences (theme, text size, folder state)
- **No global state library** — React Context + TanStack Query is enough

### Styling
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first CSS
- **Custom components** in `app/components/ui/`
- **Responsive breakpoints** for mobile/tablet/desktop

### PWA
- **Service Worker** (`/service-worker.js`) for offline support
- **Web App Manifest** (`/manifest.json`) for installability
- **Cache strategies:**
  - Cache-first for static assets (JS, CSS, images)
  - Network-first for API calls
- Auto-update on service worker changes

## State Management

### Server State (TanStack Query)
Queries:
- `sessions` — List of all chat sessions
- `messages` — Messages for current session
- `personas` — Available personas from Gateway
- `models` — Available AI models from Gateway

Mutations:
- `sendMessage` — Send chat message
- `deleteSession` — Delete session (archives, doesn't destroy)
- `renameSession` — Update session title

### UI State (localStorage)
Persisted preferences:
- `theme` — light/dark/system
- `textSize` — S/M/L/XL
- `foldersState` — Expanded/collapsed folders
- `pinnedSessions` — Pinned session IDs
- `ttsEnabled` — Voice playback toggle
- `personaPickerEnabled` — Persona picker toggle
- `smartTitlesEnabled` — LLM title generation toggle
- `smartFollowupsEnabled` — LLM follow-up suggestions toggle

## Environment Variables

### Required
- `CLAWDBOT_GATEWAY_URL` — OpenClaw Gateway WebSocket URL
- Auth: `CLAWDBOT_GATEWAY_TOKEN` (recommended) or `CLAWDBOT_GATEWAY_PASSWORD`

### Optional
- `OPENCLAW_GATEWAY` — CLI compatibility alias set by `opencami --gateway` (not the primary server key)
- `FILES_ROOT` — Root directory for file explorer (enables file browsing)
- `OPENAI_API_KEY` — For LLM features (smart titles, smart follow-ups)

## Security

### Path Jailing (File Explorer)
- All file paths resolved relative to `FILES_ROOT`
- Symlink escape protection (rejects paths outside jail)
- No directory traversal attacks (`../../../` blocked)

### Token Management
- Gateway token never exposed to browser
- Token stored server-side only
- WebSocket auth handled by server

### Content Security
- Markdown sanitization (prevents XSS)
- Image compression (prevents memory exhaustion)
- File type validation (file explorer only allows safe extensions)

## Performance

### Optimizations
- **Code splitting** — Route-based lazy loading
- **Image compression** — Auto-resize before upload
- **Debounced search** — Reduces re-renders
- **Virtual scrolling** — (future: for large message lists)

### Bundle Size
- Main bundle: ~150KB gzipped
- Route chunks: 10-30KB each
- Total cold load: ~200KB (excluding images)
