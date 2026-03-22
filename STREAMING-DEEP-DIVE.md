# OpenCami Streaming — Deep Technical Dive

## Executive Summary

OpenCami is a web client for OpenClaw (AI gateway). Streaming means showing LLM responses token-by-token as they're generated, including showing tool call status (e.g. "running web_search...") inline.

**Current status (v1.8.13):** Streaming works for the first message in a chat. Second and subsequent messages have issues. Tool call UI rendering order is wrong.

---

## Architecture Overview

```
Browser (React)              OpenCami Server (Node/Vite SSR)         OpenClaw Gateway
    │                               │                                      │
    ├── POST /api/send ──────────>  ├── gatewayRpcShared('chat.send') ──> │ starts agent run
    │                               │   (over shared WS connection)        │
    ├── GET /api/stream?sk=X ────>  ├── acquireGatewayClient(key) ──────> │ WS connection
    │   (EventSource/SSE)           │   receives ALL gateway events        │ sends events:
    │                               │   filters by sessionKey              │   - agent (deltas)
    │   <── SSE data frames ──────  │   <── forwards matching events ────  │   - chat (state)
    │                               │                                      │
    use-streaming.ts                stream.ts                              gateway internals
    (client-side parsing)           (server-side SSE proxy)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/screens/chat/chat-screen.tsx` | Main chat UI, orchestrates send + stream |
| `src/screens/chat/hooks/use-streaming.ts` | Client-side SSE event parsing & React state |
| `src/routes/api/stream.ts` | Server-side SSE endpoint (raw event proxy) |
| `src/routes/api/send.ts` | Server-side message send endpoint |
| `src/server/gateway.ts` | Gateway WebSocket client (persistent + shared connections) |

---

## How the Gateway Streaming Protocol Works

The OpenClaw gateway uses a WebSocket protocol. When a client sends `chat.send`, the gateway:

1. Starts an agent run (LLM inference)
2. Calls `registerToolEventRecipient(runId, connId)` to link the run to the WS connection
3. Emits events on that connection:
   - `agent` events with `stream: "lifecycle"`, `stream: "assistant"`, `stream: "tool-call"`, etc.
   - `chat` events with `state: "final"` when the full response is complete

**CRITICAL:** The gateway only sends `agent` events to connections that declared `caps: ['tool-events']` in their `connect` handshake. Without this cap, you get ZERO streaming events — only the final `chat` event after the full response is done.

**CRITICAL:** The `connId` used for `registerToolEventRecipient` is the connection that sent `chat.send`. If you send `chat.send` on connection A but listen on connection B, you get nothing on B.

---

## The Three Root Causes We Fixed (PR #10, v1.8.13)

### Root Cause 1: Missing `tool-events` capability

**Before:** `caps: []` in the connect handshake.  
**After:** `caps: ['tool-events']`  
**Location:** `src/server/gateway.ts`, function `buildConnectParams()`  
**Why it matters:** Gateway checks `GATEWAY_CLIENT_CAPS.TOOL_EVENTS` before calling `registerToolEventRecipient`. Without this cap, the connection is invisible to the streaming system.

### Root Cause 2: chat.send on wrong connection

**Before:** `send.ts` used `gatewayRpc()` which created a NEW throwaway WS connection for each message. The gateway registered THAT connection's `connId` for events. But the connection was closed immediately after the RPC response.

**After:** `send.ts` uses `gatewayRpcShared('chat.send', params, sessionKey)` which sends over the SAME shared WS connection that the SSE stream is listening on.

**Location:** `src/routes/api/send.ts` line ~100, `src/server/gateway.ts` `gatewayRpcShared()`  
**Key insight:** `acquireGatewayClient(key)` creates a ref-counted WS connection keyed by sessionKey. Both `stream.ts` and `send.ts` must use the SAME connection for the same sessionKey.

### Root Cause 3: Server-side stream filtering killed tool-call runs

**Before:** `stream.ts` parsed events server-side, tracked `lifecycle.end`, and closed the SSE connection after the first `lifecycle.end`. But after a tool call completes, a NEW agent run starts (the LLM processes the tool result). The premature close killed streaming for the second half.

**After:** `stream.ts` is a "dumb proxy" — it forwards ALL events from the gateway to the client via SSE, with only a sessionKey filter. All parsing logic moved to client-side `use-streaming.ts`.

This matches upstream WebClaw's architecture exactly.

---

## Current Known Issues (What Still Needs Fixing)

### Issue 1: Second message in same chat shows nothing / "Generating" flash

**Symptom:** First message streams perfectly. Second message shows "Generating" briefly, then disappears. After page reload, the response is there.

**Root cause analysis:**

The flow for sending a message is:
```
1. sendMessage() called (chat-screen.tsx:655)
2. streamStart() — starts polling fallback (line 700)
3. startStream(preStreamKey) — opens/reuses EventSource (line 705)
4. fetch('/api/send') — sends message to gateway
5. .then(() => startStream(resolvedKey)) — starts stream again with resolved key (line 728)
```

`startStream()` in `use-streaming.ts` (line 68):
- Sets `doneRef.current = false`
- Sets `finalStateRef.current = false`  
- Clears `activeRunsRef`
- If EventSource already exists, **returns early** (reuses it)

After the first message completes, the EventSource stays open (we don't close it). `doneRef` is set to `true` by the `chat` `final` handler (line 117).

For the second message:
- `startStream()` is called → resets `doneRef` to `false` ✓
- EventSource is reused (already open) ✓
- `fetch('/api/send')` sends the message
- Gateway processes it and sends events on the **shared WS connection**

**The problem is likely one of:**

a) **Connection mismatch:** The `acquireGatewayClient` in `stream.ts` created a WS connection for the first message. When `send.ts` calls `gatewayRpcShared`, it looks up the shared client by sessionKey. But `stream.ts` uses `acquireGatewayClient` which is in the `sharedGatewayClients` map — while `send.ts` checks the SAME map. If the stream's connection dropped and reconnected with a new `connId`, the gateway registered the old `connId` for events.

b) **Event routing on gateway side:** The gateway's `registerToolEventRecipient` links a `runId` to a `connId`. For the second message, a NEW `runId` is created. The gateway should call `registerToolEventRecipient` again for the new run on the same `connId`. If this isn't happening, events for the second run go nowhere.

c) **PersistentGatewayConnection vs createGatewayClient:** There are TWO connection systems in `gateway.ts`:
   - `PersistentGatewayConnection` (singleton, used by `gatewayRpc()`)
   - `createGatewayClient()` (per-session, used by `acquireGatewayClient()`)
   
   `stream.ts` uses `acquireGatewayClient()` (creates a per-session WS client).
   `send.ts` uses `gatewayRpcShared()` which tries the shared client first, falls back to `gatewayRpc()` (persistent singleton).
   
   If `gatewayRpcShared` can't find the shared client (e.g. it was released), it falls back to `gatewayRpc()` — which uses a DIFFERENT connection. Then `chat.send` goes over the persistent connection, but events come to the shared client. **connId mismatch!**

**Suggested investigation:**
1. Add logging to see which connection `chat.send` actually goes through
2. Check if `sharedGatewayClients.get(key)` returns the expected client in `gatewayRpcShared`
3. Verify the gateway logs show `registerToolEventRecipient` being called for the second message's `runId`

### Issue 2: Tool call cards appear AFTER text instead of BEFORE

**Symptom:** When the LLM uses a tool, the tool status card ("running web_search...") appears below the response text instead of inline where the tool call happened.

**Root cause:** In `use-streaming.ts`, `handleAgentEvent()` maintains two separate state arrays:
- `text` (string, concatenated assistant deltas)
- `tools` (array of `{name, status, id}`)

These are independent — there's no positional information about WHERE in the text stream a tool call occurred. The rendering component just shows text first, then tools (or vice versa).

**Fix approach:** Track tool call positions relative to the text stream. When a `tool-call` event arrives, note the current text length as the insertion point. The rendering component can then interleave tool cards at the correct position. This is how upstream WebClaw does it in `use-chat-stream.ts` (710 lines) — it maintains a richer event log, not just concatenated text.

### Issue 3: "Generating" flash before first delta

**Symptom:** When you send a message, "Generating..." appears briefly, then nothing for a moment, then the stream starts.

**Root cause:** `startStream()` sets `active: true` immediately. But the first `agent` event only arrives after the gateway has started the agent run, loaded the model, and generated the first token. This delay is normal (1-3 seconds for large models). The UI shows "Generating" during this gap.

**Fix approach:** Either accept this as expected behavior, or add a minimum display time / smooth transition so it doesn't flash and disappear.

---

## Gateway Connection Architecture (gateway.ts)

There are TWO independent connection systems:

### 1. PersistentGatewayConnection (Singleton)
- Created once, stored on `process.__opencamiGatewayInstance`
- Stored on `process` (not `globalThis`) because Vite SSR uses `node:vm` contexts with separate `globalThis` — using `globalThis` caused duplicate connections and doubled streaming text
- Auto-reconnects on disconnect
- Has its own event routing: `sessionListeners` map + `globalListeners` set + `eventBuffer`
- Used by `gatewayRpc()` for general RPCs (sessions.list, sessions.resolve, etc.)
- NOT directly used for streaming events in the current architecture

### 2. createGatewayClient() (Per-Session)
- Created by `acquireGatewayClient(key)`, stored in `sharedGatewayClients` map
- Ref-counted: multiple callers can share the same client, released when refs hit 0
- Each client opens its own WS connection to the gateway
- Used by `stream.ts` for receiving events AND by `send.ts` (via `gatewayRpcShared`) for sending

**Why two systems?** Historical. The persistent connection was the original approach. The shared per-session clients were ported from upstream WebClaw during the streaming fix. They could potentially be unified, but both work.

---

## SSE Stream Lifecycle

```
1. Browser opens EventSource → GET /api/stream?sessionKey=X
2. stream.ts calls acquireGatewayClient(X)
   → Creates new WS connection to gateway (or reuses existing for same key)
   → Registers onEvent callback
3. stream.ts writes ": connected\n\n" to SSE
4. Gateway events arrive on WS → onEvent filters by sessionKey → forwards as SSE data frames
5. Browser's use-streaming.ts parses SSE events:
   - "agent" events → handleAgentEvent() → updates text/tools state
   - "chat" events → checks for state:"final" → marks done
6. On chat final: doneRef=true, active=false, onDone callback fires
7. EventSource stays open for next message (NOT closed)
8. On browser tab close / navigation: EventSource closes → stream.ts cleanup → releaseClient
```

---

## SessionKey Filter (stream.ts)

The gateway broadcasts ALL events to all connected clients. Without filtering, the OpenCami chat would show events from Telegram, Discord, cron jobs, etc.

Current filter logic:
```typescript
const eventSessionKey = typeof p?.sessionKey === 'string' ? p.sessionKey : ''
if (eventSessionKey && !eventSessionKey.includes(key)) {
  return // skip this event
}
```

Events without a sessionKey (health, presence, tick) pass through. Events with a sessionKey only pass if it contains the requested key (supports both exact match and `agent:main:main` matching `main`).

---

## Upstream Reference (WebClaw)

OpenCami is forked from [ibelick/webclaw](https://github.com/ibelick/webclaw). Key upstream files:

- `apps/webclaw/src/routes/api/stream.ts` — raw event proxy (our stream.ts matches this)
- `apps/webclaw/src/server/gateway.ts` — `acquireGatewayClient()`, shared per-session connections
- `apps/webclaw/src/screens/chat/hooks/use-chat-stream.ts` — **710 lines** of client-side event handling

Our `use-streaming.ts` is a simplified version of upstream's `use-chat-stream.ts`. The upstream version maintains a full event log with positional tool call tracking, thinking blocks, and more. This is likely why upstream doesn't have the tool-card ordering issue.

---

## File Inventory (All Files Relevant to Streaming)

### Modified in PR #10 (v1.8.13):
- `src/server/gateway.ts` — Added `acquireGatewayClient()`, `gatewayRpcShared()`, `createGatewayClient()`, changed caps to `['tool-events']`
- `src/routes/api/stream.ts` — Replaced server-side filtering with raw event proxy + sessionKey filter
- `src/routes/api/send.ts` — Changed `gatewayRpc` → `gatewayRpcShared` for `chat.send`
- `src/screens/chat/hooks/use-streaming.ts` — Client-side event parsing for raw agent/chat events

### Related but not modified:
- `src/screens/chat/chat-screen.tsx` — `sendMessage()` function orchestrates send + stream (lines 655-735)
- `src/screens/chat/hooks/use-chat-messages.ts` — History fetching, optimistic updates
- `src/screens/chat/components/` — Message rendering components

---

## Test Commands

### Test SSE stream directly (curl):
```bash
# Start a stream listener
curl -N "http://YOUR_SERVER_IP:3003/api/stream?sessionKey=webchat" &

# Send a message
curl -X POST "http://YOUR_SERVER_IP:3003/api/send" \
  -H "Content-Type: application/json" \
  -d '{"sessionKey":"webchat","message":"hello"}'
```

### Check gateway WS directly:
```bash
# Gateway is at ws://127.0.0.1:18789
```

### OpenCami URLs:
- Direct: `http://YOUR_SERVER_IP:3003`
- Tailscale: `https://your-openclaw-server.ts.net:3001` (proxies to 3003)

---

## Summary of What Works vs What Doesn't

| Feature | Status | Notes |
|---------|--------|-------|
| First message streaming | ✅ Works | Token-by-token, includes tool calls |
| Tool call indicators | ⚠️ Partial | Shows up but in wrong order (after text) |
| Second message streaming | ❌ Broken | Shows "Generating" flash then nothing |
| Cross-session isolation | ✅ Works | SessionKey filter prevents leakage |
| SSE keepalive | ✅ Works | 15s ping interval |
| Auto-reconnect | ✅ Works | On WS connection drop |
| Multiple browser tabs | ❓ Untested | Each tab opens its own EventSource + WS |
