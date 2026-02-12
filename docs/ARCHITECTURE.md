# Architecture

> Complete technical architecture of OpenCami — a modern web client for OpenClaw.

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Gateway Connection](#gateway-connection)
- [Real-Time Streaming](#real-time-streaming)
- [State Management](#state-management)
- [API Routes](#api-routes)
- [Session Management](#session-management)
- [Security](#security)
- [Performance](#performance)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Browser                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    OpenCami React App                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │ │
│  │  │  Router  │  │ TanStack │  │ Zustand  │  │   UI Components  │   │ │
│  │  │ (Routes) │  │  Query   │  │ (Stores) │  │   (React 19)     │   │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │ │
│  │       │             │             │                  │             │ │
│  │       └─────────────┴─────────────┴──────────────────┘             │ │
│  │                              │                                      │ │
│  │                      HTTP / SSE / WS                               │ │
│  └──────────────────────────────┼─────────────────────────────────────┘ │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         OpenCami Server (Nitro)                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   API Routes     │  │  File System     │  │  Gateway Connection  │  │
│  │  /api/tts        │  │  /api/files/*    │  │  Persistent WS       │  │
│  │  /api/stt        │  │  Path jailing    │  │  RPC + Events        │  │
│  │  /api/personas   │  │  Safe traversal  │  │  Auto-reconnect      │  │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────────┘  │
│           │                     │                     │                 │
│           └─────────────────────┴─────────────────────┘                 │
│                                 │                                       │
│                          WebSocket (ws://)                              │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        OpenClaw Gateway                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────────────┐│
│  │  Sessions │  │   Agents  │  │   Skills  │  │   Model Providers     ││
│  │  Storage  │  │  Runtime  │  │  Registry │  │   (Claude, GPT, etc)  ││
│  └───────────┘  └───────────┘  └───────────┘  └───────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **[Vite 7](https://vitejs.dev/)** | Build tool with HMR, fast cold starts |
| **[React 19](https://react.dev/)** | UI library with concurrent features |
| **[TanStack Router](https://tanstack.com/router)** | Type-safe file-based routing |
| **[TanStack Start](https://tanstack.com/start)** | Full-stack React meta-framework |
| **[TanStack Query](https://tanstack.com/query)** | Server state management, caching |
| **[Zustand](https://zustand-demo.pmnd.rs/)** | Lightweight client state |
| **[Tailwind CSS 4](https://tailwindcss.com/)** | Utility-first styling |
| **[Motion](https://motion.dev/)** | Animations |
| **[Shiki](https://shiki.matsu.io/)** | Syntax highlighting |

### Backend (Server-Side)

| Technology | Purpose |
|------------|---------|
| **[Nitro](https://nitro.unjs.io/)** | Universal server runtime |
| **Node.js 18+** | Runtime environment |
| **[ws](https://github.com/websockets/ws)** | WebSocket client for Gateway |
| **[node-edge-tts](https://github.com/nicekid1/node-edge-tts)** | Free TTS fallback |

### Build & Deploy

| Technology | Purpose |
|------------|---------|
| **npm** | Package management |
| **TypeScript** | Type safety |
| **Docker** | Containerization |
| **Tauri v2** | Desktop app (optional) |
| **Capacitor** | Mobile app (optional) |

---

## Project Structure

```
opencami/
├── bin/
│   └── opencami.js          # CLI entry point
├── docs/                     # Documentation
├── public/                   # Static assets
├── src/
│   ├── __tests__/           # Test setup
│   ├── components/          # Shared UI components
│   │   ├── ui/              # Base components (button, dialog, etc.)
│   │   ├── prompt-kit/      # Chat-specific components
│   │   ├── attachment-*.tsx # File attachment components
│   │   ├── model-selector.tsx
│   │   ├── persona-picker.tsx
│   │   ├── search-dialog.tsx
│   │   └── keyboard-shortcuts-dialog.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── use-chat-settings.ts
│   │   ├── use-keyboard-shortcuts.ts
│   │   ├── use-llm-settings.ts
│   │   ├── use-mcp-settings.ts
│   │   ├── use-search.ts
│   │   ├── use-skills.ts
│   │   └── use-thinking-level.ts
│   ├── lib/                 # Utilities
│   │   ├── file-types.ts    # File type definitions
│   │   ├── llm-client.ts    # LLM API client
│   │   └── utils.ts         # General utilities
│   ├── routes/              # TanStack Router pages
│   │   ├── api/             # API endpoints
│   │   │   ├── files/       # File explorer APIs
│   │   │   ├── tts.ts       # Text-to-speech
│   │   │   └── stt.ts       # Speech-to-text
│   │   ├── chat/            # Chat routes
│   │   ├── files/           # File explorer routes
│   │   └── __root.tsx       # Root layout
│   ├── screens/             # Feature modules
│   │   ├── chat/            # Chat feature
│   │   │   ├── components/  # Chat-specific components
│   │   │   ├── hooks/       # Chat-specific hooks
│   │   │   ├── lib/         # Chat utilities
│   │   │   └── chat-screen.tsx
│   │   ├── files/           # File explorer feature
│   │   ├── settings/        # Settings feature
│   │   ├── agents/          # Agent manager
│   │   └── bots/            # Bot configuration
│   ├── server/              # Server modules
│   │   ├── gateway.ts       # Gateway connection singleton
│   │   ├── filesystem.ts    # File operations
│   │   └── path-utils.ts    # Path security
│   ├── router.tsx           # Router configuration
│   └── routeTree.gen.ts     # Generated route tree
├── src-tauri/               # Tauri desktop app
├── android/                 # Capacitor Android app
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Gateway Connection

### Connection Architecture

OpenCami maintains a **persistent WebSocket connection** to the OpenClaw Gateway:

```typescript
// src/server/gateway.ts
class PersistentGatewayConnection {
  private ws: WebSocket | null = null
  private connected = false
  private pendingRpcs = new Map<string, PendingRpc>()
  private sessionListeners = new Map<string, Set<StreamListener>>()
  
  async ensureConnected(): Promise<void>
  async rpc<T>(method: string, params?: unknown): Promise<T>
  subscribe(sessionKey: string, listener: StreamListener): () => void
}
```

### Key Features

1. **Singleton Pattern** — One persistent connection shared by all requests
2. **Auto-Reconnect** — Exponential backoff (1s → 30s max)
3. **RPC + Events** — Request/response with streaming event subscriptions
4. **Event Buffering** — Late subscribers receive buffered events

### Authentication

```bash
# Environment variables (server-side only)
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=your_token_here
# OR
CLAWDBOT_GATEWAY_PASSWORD=your_password
```

The token is **never exposed to the browser**. All Gateway communication happens server-side.

### Protocol

OpenCami uses Gateway Protocol v3:

```typescript
// Request frame
{ type: 'req', id: 'uuid', method: 'sessions.list', params: {...} }

// Response frame
{ type: 'res', id: 'uuid', ok: true, payload: {...} }
{ type: 'res', id: 'uuid', ok: false, error: { code: 'ERR', message: '...' } }

// Event frame (streaming)
{ type: 'event', event: 'session.delta', payload: {...}, seq: 42 }
```

---

## Real-Time Streaming

### Data Flow

```
User Types Message
       │
       ▼
┌──────────────────┐
│  React Component │ ──── POST /api/chat/send ────▶ Server
│  (ChatComposer)  │                                   │
└──────────────────┘                                   │
                                                       ▼
                                              ┌────────────────┐
                                              │ Gateway RPC    │
                                              │ chat.send()    │
                                              └────────┬───────┘
                                                       │
SSE Connection ◀───── Server-Sent Events ◀────────────┘
       │
       ▼
┌──────────────────┐
│  React Component │
│ (ChatMessageList)│ ──── Token-by-token rendering
└──────────────────┘
```

### Implementation Details

1. **Client → Server**: HTTP POST with message content
2. **Server → Gateway**: WebSocket RPC call
3. **Gateway → Server**: Streaming events on same WS connection
4. **Server → Client**: Server-Sent Events (SSE) forward deltas

```typescript
// SSE endpoint: /api/chat/stream
// Event types:
// - delta: Text chunk
// - tool_start: Tool execution begins
// - tool_end: Tool execution completes
// - done: Stream finished
```

### Fallback Mechanism

If SSE disconnects, the client falls back to **fast-polling** (200ms interval) until reconnected.

---

## State Management

### Server State (TanStack Query)

```typescript
// Query keys
const queryKeys = {
  sessions: ['sessions'],
  messages: (sessionKey: string) => ['messages', sessionKey],
  personas: ['personas'],
  models: ['models'],
  skills: ['skills'],
}

// Example query
const { data: sessions } = useQuery({
  queryKey: queryKeys.sessions,
  queryFn: () => gatewayRpc('sessions.list'),
  staleTime: 30_000,
})
```

### Client State (Zustand + localStorage)

```typescript
// src/hooks/use-chat-settings.ts
interface ChatSettings {
  theme: 'light' | 'dark' | 'system' | 'chameleon' | 'frost'
  showToolMessages: boolean
  showReasoningBlocks: boolean
  showSearchSources: boolean
  inlineFilePreview: boolean
}

// src/hooks/use-llm-settings.ts
interface LlmSettings {
  llmFeaturesEnabled: boolean
  apiKey: string
  provider: 'openai' | 'openrouter' | 'ollama' | 'custom'
  baseUrl: string
  model: string
}
```

### localStorage Keys

| Key | Type | Description |
|-----|------|-------------|
| `opencami-theme` | string | Theme preference |
| `opencami-text-size` | string | Text size (S/M/L/XL) |
| `opencami-tts-enabled` | boolean | TTS toggle |
| `opencami-tts-provider` | string | TTS provider |
| `opencami-tts-voice` | string | Voice selection |
| `opencami-stt-provider` | string | STT provider |
| `opencami-personas-enabled` | boolean | Persona picker toggle |
| `opencami-pinned-sessions` | string[] | Pinned session IDs |
| `opencami-folders-state` | object | Folder collapse state |
| `opencami-llm-*` | various | LLM feature settings |

---

## API Routes

### Chat APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat/send` | POST | Send message to Gateway |
| `/api/chat/stream` | GET | SSE stream for responses |
| `/api/chat/sessions` | GET | List all sessions |
| `/api/chat/history` | GET | Get session messages |

### Voice APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tts` | POST | Text-to-speech conversion |
| `/api/stt` | POST | Speech-to-text transcription |

**TTS Provider Cascade:**
1. ElevenLabs (if API key configured)
2. OpenAI TTS (if API key available)
3. Edge TTS (free fallback, always works)

**STT Provider Cascade:**
1. ElevenLabs Scribe v2
2. OpenAI Whisper
3. Browser Web Speech API (client-side)

### File APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files/list` | GET | List directory contents |
| `/api/files/read` | GET | Read file content |
| `/api/files/write` | POST | Write file content |
| `/api/files/rename` | POST | Rename file/folder |
| `/api/files/delete` | POST | Delete file/folder |
| `/api/files/upload` | POST | Upload file |
| `/api/files/download` | GET | Download file |
| `/api/files/info` | GET | Get file metadata |

### Other APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/personas` | GET | List available personas |
| `/api/models` | GET | List available models |
| `/api/skills` | GET | List installed skills |
| `/api/agents` | GET | List configured agents |

---

## Session Management

### Session Key Structure

Sessions use semantic key patterns:

```
agent:<agent_name>:<session_type>:<identifier>

Examples:
agent:main:main              # Main chat session
agent:main:subagent:abc123   # Sub-agent session
agent:main:cron:daily-check  # Cron job session
agent:main:telegram:123456   # Channel-bound session
```

### Session Kinds

Auto-detected from key pattern for folder grouping:

| Kind | Pattern | Folder |
|------|---------|--------|
| `chat` | `:main` or no special suffix | 💬 Chats |
| `subagent` | `:subagent:` | 🤖 Sub-agents |
| `cron` | `:cron:` | ⏰ Cron |
| `other` | Everything else | 📁 Other |

### Protected Sessions

Cannot be deleted from UI:

- **Main session**: `agent:main:main`
- **Channel-bound**: Contains `:telegram:`, `:discord:`, `:signal:`, `:whatsapp:`, `:slack:`, `:imessage:`

Sessions are **archived** on deletion, not permanently destroyed.

---

## Security

### Path Jailing (File Explorer)

```typescript
// src/server/path-utils.ts
function resolveSafePath(base: string, requested: string): string | null {
  const resolved = path.resolve(base, requested)
  const real = fs.realpathSync(resolved)
  
  // Reject if resolved path escapes jail
  if (!real.startsWith(base)) {
    return null // Blocked
  }
  return real
}
```

- All paths resolved relative to `FILES_ROOT`
- Symlink escape protection
- Directory traversal (`../`) blocked

### Token Security

- Gateway token stored **server-side only**
- Never exposed to browser JavaScript
- No cookies or sessions — stateless design

### Content Security

- Markdown sanitized (XSS prevention)
- Image compression (memory protection)
- File type validation (safe extensions only)

---

## Performance

### Bundle Optimization

| Metric | Value |
|--------|-------|
| Main bundle | ~150KB gzipped |
| Route chunks | 10-30KB each |
| Total cold load | ~200KB |

### Optimization Techniques

1. **Code Splitting** — Route-based lazy loading
2. **Lazy Dialogs** — Search, Shortcuts, Settings load on demand
3. **content-visibility: auto** — Skip off-screen message rendering
4. **Image Compression** — Auto-resize before upload (512KB WS limit)
5. **Debounced Search** — Reduces re-renders
6. **Stable Refs** — Memoized callbacks and components

### PWA Caching

```javascript
// Cache strategies
{
  'static-assets': 'cache-first',    // JS, CSS, images
  'api-calls': 'network-first',      // /api/*
  'navigation': 'network-first',     // HTML pages
}
```

---

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `CLAWDBOT_GATEWAY_URL` | Gateway WebSocket URL (default: `ws://127.0.0.1:18789`) |
| `CLAWDBOT_GATEWAY_TOKEN` | Gateway auth token |

### Optional

| Variable | Description |
|----------|-------------|
| `CLAWDBOT_GATEWAY_PASSWORD` | Alternative auth (if no token) |
| `FILES_ROOT` | File explorer root directory |
| `OPENAI_API_KEY` | LLM features (smart titles, follow-ups) |
| `ELEVENLABS_API_KEY` | Premium TTS/STT |
| `PORT` | HTTP server port (default: 3000) |

---

## Related Documentation

- [Features](./FEATURES.md) — Complete feature list
- [Deployment](./DEPLOYMENT.md) — Self-hosting guide
- [API Reference](./API.md) — Gateway integration details
- [Contributing](./CONTRIBUTING.md) — Development setup
