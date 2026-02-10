# OpenCami Codebase Review

## 🔴 Critical issues (must fix before release)
- None found.

## 🟡 Warnings (should fix)
- LocalStorage stores user LLM API keys; any XSS or shared-browser access can exfiltrate secrets. `src/hooks/use-llm-settings.ts:11`, `src/hooks/use-llm-settings.ts:120`
- Server accepts client-supplied `X-LLM-Base-URL` and uses it directly for server-side fetches; if the server is exposed, this is an SSRF surface. `src/routes/api/llm-features.ts:61`
- File explorer API routes are unauthenticated; if the server is exposed beyond localhost, any user can read/write/delete within `FILES_ROOT`/`HOME`. `src/routes/api/files/read.ts:20`, `src/routes/api/files/save.ts:20`, `src/routes/api/files/delete.ts:17`, `src/routes/api/files/upload.ts:20`
- `testApiKey` ignores custom/base URL; “Test” will always hit the OpenAI default and fail for OpenRouter/custom providers. `src/lib/llm-client.ts:187`, `src/routes/api/llm-features.ts:253`
- Follow-up suggestions hook never aborts in-flight requests on unmount and ignores `timeoutMs`, risking extra work and leaks on navigation. `src/screens/chat/hooks/use-follow-up-suggestions.ts:99`
- Code block renderer eagerly bundles many Shiki language modules and themes on the client, increasing bundle size and startup cost. `src/components/prompt-kit/code-block/index.tsx:4`
- History API returns `messages: Array<any>` which weakens type safety and hides contract drift. `src/routes/api/history.ts:6`
- `/api/paths` exposes absolute filesystem paths to the client, which can leak sensitive directory structure. `src/routes/api/paths.ts:6`

## 🟢 Good practices found
- File path sanitization + realpath jail prevents traversal and symlink escapes. `src/server/path-utils.ts:6`, `src/server/filesystem.ts:20`
- File read/write/upload endpoints enforce size limits to protect memory. `src/routes/api/files/read.ts:14`, `src/routes/api/files/save.ts:18`, `src/routes/api/files/upload.ts:7`
- Streaming uses SSE with controlled cleanup and keeps UI responsive while waiting for history sync. `src/screens/chat/hooks/use-streaming.ts:25`
- LLM requests use `AbortController` with timeouts to avoid hanging network calls. `src/lib/llm-client.ts:70`
- Thinking level is persisted via Zustand and wired into send payloads. `src/hooks/use-thinking-level.ts:9`, `src/screens/chat/chat-screen.tsx:607`

## 📋 Recommended fixes (with file:line references)
- Move LLM API keys out of localStorage (e.g., session storage + in-memory, or server-side encrypted store), and mask UI further. `src/hooks/use-llm-settings.ts:120`
- Restrict or validate `X-LLM-Base-URL` (allowlist, same-origin, or explicit opt-in). `src/routes/api/llm-features.ts:61`
- Add auth (token, basic auth, or gateway session) + CSRF protection for file APIs if the server is reachable externally. `src/routes/api/files/read.ts:20`
- Pass `baseUrl` into `testApiKey` or add provider-specific test logic. `src/lib/llm-client.ts:187`, `src/routes/api/llm-features.ts:253`
- Use `AbortController` cleanup on unmount and honor `timeoutMs` in follow-up requests. `src/screens/chat/hooks/use-follow-up-suggestions.ts:99`
- Lazy-load Shiki languages/themes or split code highlighting into a separate chunk. `src/components/prompt-kit/code-block/index.tsx:4`
- Replace `Array<any>` with a concrete `GatewayMessage[]` or validated shape. `src/routes/api/history.ts:6`
- Remove or guard `/api/paths` in production builds. `src/routes/api/paths.ts:6`
