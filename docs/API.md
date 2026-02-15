# API Reference

> Gateway integration, WebSocket protocol, and API endpoints for OpenCami.

## Table of Contents

- [Overview](#overview)
- [Gateway Connection](#gateway-connection)
- [WebSocket Protocol](#websocket-protocol)
- [REST API Endpoints](#rest-api-endpoints)
- [Server-Sent Events](#server-sent-events)
- [Session Management](#session-management)
- [Error Handling](#error-handling)

---

## Overview

OpenCami communicates with OpenClaw through two channels:

1. **Server ↔ Gateway**: WebSocket (persistent, bidirectional)
2. **Browser ↔ Server**: HTTP/SSE (request/response + streaming)

```
┌─────────┐     HTTP/SSE      ┌─────────┐    WebSocket    ┌─────────┐
│ Browser │ ◄──────────────► │ Server  │ ◄─────────────► │ Gateway │
└─────────┘                   └─────────┘                 └─────────┘
```

The server acts as a **secure proxy** — the browser never connects directly to the Gateway.

---

## Gateway Connection

### Authentication

OpenCami authenticates with the Gateway using either:

```bash
# Token-based (recommended)
CLAWDBOT_GATEWAY_TOKEN=your_token_here

# OR password-based
CLAWDBOT_GATEWAY_PASSWORD=your_password
```

### Connection Parameters

```typescript
interface ConnectParams {
  minProtocol: 3
  maxProtocol: 3
  client: {
    id: 'gateway-client'
    displayName: 'webclaw'
    version: string
    platform: string
    mode: 'ui'
    instanceId: string  // UUID per connection
  }
  auth: {
    token?: string
    password?: string
  }
  role: 'operator'
  scopes: ['operator.admin']
}
```

### Connection Lifecycle

```typescript
// src/server/gateway.ts

// 1. Connect (singleton, auto-reconnect)
await getPersistentConnection().ensureConnected()

// 2. Send RPC
const sessions = await gatewayRpc<Session[]>('sessions.list')

// 3. Subscribe to events
const unsubscribe = subscribeGatewayEvents(sessionKey, (event) => {
  console.log('Event:', event.event, event.payload)
})

// 4. Cleanup (rarely needed)
unsubscribe()
```

### Auto-Reconnect

The connection automatically reconnects with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5+ | 30s (max) |

---

## WebSocket Protocol

### Frame Types

All frames are JSON with a `type` field:

#### Request Frame

```typescript
{
  type: 'req',
  id: string,      // UUID for correlation
  method: string,  // RPC method name
  params?: unknown // Method parameters
}
```

#### Response Frame

```typescript
// Success
{
  type: 'res',
  id: string,       // Matches request id
  ok: true,
  payload?: unknown // Response data
}

// Error
{
  type: 'res',
  id: string,
  ok: false,
  error: {
    code: string,
    message: string,
    details?: unknown
  }
}
```

#### Event Frame

```typescript
{
  type: 'event',
  event: string,           // Event name
  payload?: Record<string, unknown>,
  seq?: number             // Sequence number (for ordering)
}
```

### RPC Methods

#### Sessions

| Method | Description | Params | Returns |
|--------|-------------|--------|---------|
| `sessions.list` | List all sessions | — | `Session[]` |
| `sessions.get` | Get session details | `{ key: string }` | `Session` |
| `sessions.create` | Create new session | `{ label?: string }` | `Session` |
| `sessions.delete` | Archive session | `{ key: string }` | `void` |
| `sessions.rename` | Rename session | `{ key: string, label: string }` | `void` |

#### Chat

| Method | Description | Params | Returns |
|--------|-------------|--------|---------|
| `chat.send` | Send message | See below | `void` (streams response) |
| `chat.history` | Get message history | `{ session: string, limit?: number }` | `Message[]` |
| `chat.cancel` | Cancel generation | `{ session: string }` | `void` |

**chat.send params:**

```typescript
{
  session: string,
  message: string,
  attachments?: Array<{
    type: 'image' | 'file',
    mimeType: string,
    data?: string,        // base64 (image attachments)
    uploadedPath?: string, // /uploads/... (file attachments)
    name?: string,
    size?: number
  }>,
  model?: string,      // Override model
  thinking?: 'off' | 'low' | 'medium' | 'high'
}
```

#### Other

| Method | Description |
|--------|-------------|
| `models.list` | List available models |
| `personas.list` | List available personas |
| `skills.list` | List installed skills |
| `agents.list` | List configured agents |
| `config.get` | Get Gateway config |

### Events

Events are pushed from Gateway to client during streaming:

| Event | Payload | Description |
|-------|---------|-------------|
| `session.delta` | `{ sessionKey, delta, role }` | Text chunk |
| `session.tool_start` | `{ sessionKey, tool, id }` | Tool execution started |
| `session.tool_end` | `{ sessionKey, tool, id, result }` | Tool execution completed |
| `session.thinking` | `{ sessionKey, content }` | Reasoning block |
| `session.done` | `{ sessionKey }` | Stream finished |
| `session.error` | `{ sessionKey, error }` | Error occurred |

---

## REST API Endpoints

### Chat Endpoints

#### POST `/api/chat/send`

Send a message to a session.

**Request:**
```typescript
{
  sessionKey: string,
  message: string,
  attachments?: Attachment[],
  model?: string,
  thinking?: 'off' | 'low' | 'medium' | 'high'
}
```

**Response:**
```typescript
{ ok: true, messageId: string }
// Or error:
{ ok: false, error: string }
```

#### GET `/api/chat/sessions`

List all sessions.

**Response:**
```typescript
{
  ok: true,
  sessions: Array<{
    key: string,
    label: string,
    lastMessage?: string,
    updatedAt: string,
    tokens?: number
  }>
}
```

#### GET `/api/chat/history?session=<key>`

Get message history for a session.

**Response:**
```typescript
{
  ok: true,
  messages: Array<{
    id: string,
    role: 'user' | 'assistant',
    content: string,
    timestamp: string,
    attachments?: Attachment[]
  }>
}
```

### Voice Endpoints

#### POST `/api/tts`

Convert text to speech.

**Request:**
```typescript
{
  text: string,
  voice?: string,     // e.g., 'alloy', 'nova'
  provider?: 'auto' | 'elevenlabs' | 'openai' | 'edge'
}
```

**Response:** `audio/mpeg` binary stream

**Provider fallback:**
1. ElevenLabs (if API key)
2. OpenAI TTS (if API key)
3. Edge TTS (always works)

#### POST `/api/stt`

Transcribe audio to text.

**Request:** `multipart/form-data`
- `audio`: Audio file (webm, mp3, wav, m4a)
- `provider?`: `'auto' | 'elevenlabs' | 'openai'`
- `language?`: ISO language code

**Response:**
```typescript
{
  ok: true,
  text: string,
  provider: string
}
```

### File Endpoints

#### GET `/api/files/list?path=<path>`

List directory contents.

**Response:**
```typescript
{
  ok: true,
  files: Array<{
    name: string,
    path: string,
    type: 'file' | 'directory',
    size: number,
    modified: string
  }>
}
```

#### GET `/api/files/info?path=<path>`

Get file metadata.

**Response:**
```typescript
{ ok: true, name: string, path: string, size: number, modified: string, isDirectory: boolean }
```

#### GET `/api/files/read?path=<path>`

Read file content.

**Response:**
```typescript
{ ok: true, content: string, mimeType: string }
```

#### POST `/api/files/write`

Write file content.

**Request:**
```typescript
{ path: string, content: string }
```

#### POST `/api/files/rename`

Rename file or directory.

**Request:**
```typescript
{ oldPath: string, newPath: string }
```

#### POST `/api/files/delete`

Delete file or directory.

**Request:**
```typescript
{ path: string }
```

#### GET `/api/files/download?path=<path>`

Download file with appropriate headers.

**Response:** Binary file with `Content-Disposition` header

#### POST `/api/files/upload`

Upload file(s).

**Request:** `multipart/form-data`
- `file`: File to upload
- `path`: Destination directory

### Other Endpoints

#### GET `/api/personas`

List available personas (from personas skill).

**Response:**
```typescript
{
  ok: true,
  personas: Array<{
    id: string,
    name: string,
    description: string,
    category: string
  }>
}
```

#### GET `/api/models`

List available AI models.

**Response:**
```typescript
{
  ok: true,
  models: Array<{
    id: string,
    name: string,
    provider: string
  }>
}
```

---

## Server-Sent Events

### GET `/api/chat/stream?session=<key>`

SSE endpoint for receiving streaming responses.

**Event format:**

```
event: <event_name>
data: <json_payload>

```

**Events:**

| Event | Data | Description |
|-------|------|-------------|
| `delta` | `{ content: string }` | Text chunk |
| `tool_start` | `{ tool: string, id: string }` | Tool started |
| `tool_end` | `{ tool: string, id: string, result: unknown }` | Tool completed |
| `thinking` | `{ content: string }` | Reasoning content |
| `done` | `{}` | Stream finished |
| `error` | `{ message: string }` | Error occurred |

**Client example:**

```typescript
const eventSource = new EventSource(`/api/chat/stream?session=${sessionKey}`)

eventSource.addEventListener('delta', (e) => {
  const { content } = JSON.parse(e.data)
  appendToMessage(content)
})

eventSource.addEventListener('done', () => {
  eventSource.close()
})

eventSource.addEventListener('error', (e) => {
  console.error('SSE error:', e)
  eventSource.close()
})
```

---

## Session Management

### Session Key Format

Sessions use semantic key patterns:

```
agent:<agent_name>:<session_type>:<identifier>
```

**Examples:**

| Key | Description |
|-----|-------------|
| `agent:main:main` | Main chat session |
| `agent:main:subagent:abc123` | Sub-agent session |
| `agent:main:cron:daily-check` | Cron job session |
| `agent:main:telegram:123456` | Telegram channel session |

### Session Lifecycle

```typescript
// 1. Create session
const session = await gatewayRpc('sessions.create', { label: 'My Chat' })

// 2. Send messages
await gatewayRpc('chat.send', {
  session: session.key,
  message: 'Hello!'
})

// 3. Get history
const history = await gatewayRpc('chat.history', {
  session: session.key,
  limit: 100
})

// 4. Rename
await gatewayRpc('sessions.rename', {
  key: session.key,
  label: 'New Title'
})

// 5. Delete (archives, doesn't destroy)
await gatewayRpc('sessions.delete', {
  key: session.key
})
```

### Protected Sessions

Some sessions cannot be deleted:

- **Main session:** `agent:main:main`
- **Channel-bound:** Contains `:telegram:`, `:discord:`, `:signal:`, etc.

---

## Error Handling

### Error Response Format

```typescript
{
  ok: false,
  error: {
    code: string,      // Machine-readable code
    message: string,   // Human-readable message
    details?: unknown  // Additional context
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | Missing or invalid authentication |
| `SESSION_NOT_FOUND` | Session doesn't exist |
| `RATE_LIMITED` | Too many requests |
| `GATEWAY_ERROR` | Gateway communication failed |
| `VALIDATION_ERROR` | Invalid request parameters |
| `FILE_NOT_FOUND` | File doesn't exist |
| `PERMISSION_DENIED` | Access denied |

### Client Error Handling

```typescript
async function sendMessage(sessionKey: string, message: string) {
  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey, message })
    })
    
    const data = await response.json()
    
    if (!data.ok) {
      if (data.error.code === 'SESSION_NOT_FOUND') {
        // Handle session not found
      } else if (data.error.code === 'RATE_LIMITED') {
        // Handle rate limiting
      } else {
        // Generic error handling
        console.error('Error:', data.error.message)
      }
    }
  } catch (err) {
    // Network error
    console.error('Network error:', err)
  }
}
```

---

## TypeScript Types

### Core Types

```typescript
interface Session {
  key: string
  label: string
  lastMessage?: string
  updatedAt: string
  tokens?: number
  kind?: 'chat' | 'subagent' | 'cron' | 'other'
}

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  attachments?: Attachment[]
  toolCalls?: ToolCall[]
  thinking?: string
}

interface Attachment {
  type: 'image' | 'file'
  mimeType: string
  data?: string          // base64 for image attachments
  uploadedPath?: string  // /uploads/... for file attachments
  name?: string
  size?: number
}

interface ToolCall {
  id: string
  tool: string
  args: Record<string, unknown>
  result?: unknown
}

interface GatewayEvent {
  event: string
  payload: Record<string, unknown>
  seq?: number
}
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) — System overview
- [Features](./FEATURES.md) — Feature documentation
- [Deployment](./DEPLOYMENT.md) — Self-hosting guide
- [Contributing](./CONTRIBUTING.md) — Development setup
