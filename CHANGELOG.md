# Changelog

All notable changes to OpenCami are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) + [Semantic Versioning](https://semver.org/).

## [1.9.0] - 2026-03-11

### Fixed

- **Streaming reliability** — second and subsequent messages now stream correctly; unified gateway connection eliminates connId mismatches; seq-based dedup prevents doubled text (#4, #12) — by [@robbyczgw-cla](https://github.com/robbyczgw-cla)
- **Device pairing scopes** — request `operator.read` and `operator.write` during device pairing so connections work without `allowInsecureAuth` (#2, #13) — by [@robbyczgw-cla](https://github.com/robbyczgw-cla)
- **Dark mode visibility** — slash command menu, command help modal, and context meter now readable in dark mode (#9) — by [@maciejlis](https://github.com/maciejlis)

### Improved

- Tool call cards render inline during streaming instead of appearing after text
- Gateway connection notice shown when WebSocket is disconnected
- Cleaner event deduplication with sequence tracking

## [1.8.13] - 2026-03-10

### Fixed

- **Streaming with tool-call support** — responses now stream token-by-token, including after tool calls (#4, #10)
  - Declare `tool-events` capability so the gateway sends agent streaming events
  - Port upstream shared gateway client (`acquireGatewayClient`, `gatewayRpcShared`) so `chat.send` and event listening share the same connection
  - Replace server-side event filtering with raw event proxy (matching upstream WebClaw)
  - Filter events by sessionKey to prevent cross-session leakage
  - Reuse EventSource across messages; start stream before send to prevent race conditions

## [1.8.12] - 2026-03-10

### Fixed

- Extend `stripInboundMeta()` to strip OpenClaw gateway injection patterns (`supermemory-context`, `workspace-critical-rules`, `Sender (untrusted metadata)`, multi-blank-lines cleanup) — reported by [@maciejlis](https://github.com/maciejlis) (#1, #3)

### Changed

- Softer dark mode palette with ChatGPT-style colors — contributed by [@maciejlis](https://github.com/maciejlis) (#7)

## [1.8.11] - 2026-03-10

### Added

- Unit tests for `stripInboundMeta()` covering fenced, inline, and timestamp metadata patterns — co-authored by [@maciejlis](https://github.com/maciejlis) (#6)

### Note

The `getNormalizedURL` fix and `stripInboundMeta` production code were already included in earlier releases. This release adds test coverage only.

## [1.8.10] - 2026-03-10

### Fixed

- 🔒 **pnpm lockfile sync** — Synchronized `pnpm-lock.yaml` after dependency removal to keep installs reproducible and CI consistent

## [1.8.9] - 2026-03-08

### Fixed

- 🔕 **Notification permission** — Removed aggressive auto-prompt on first interaction; permission now only requested when user explicitly enables notifications in settings
- 📎 **Attachment cleanup** — Removing an uploaded file chip now also clears the injected `📎 Uploaded file:` text from the composer
- 📊 **Dashboard polling** — All dashboard queries now pause polling when the browser tab is hidden, saving bandwidth and CPU
- 🔌 **Port alignment** — Dev server port unified to 3003 across `package.json` and `vite.config.ts`

## [1.8.8] - 2026-03-08

### Fixed

- 🔧 **Chat polling** — `streamStart()` now only fires after `/api/send` succeeds, reducing duplicate history fetches
- 🔇 **Hidden tab polling** — Session polling pauses when browser tab is not visible
- 🎤 **Mic error UX** — Replaced blocking `alert()` dialogs with inline toast-style error messages

### Changed

- 🗑️ **Model picker removed** — Non-functional picker removed from composer; proper implementation via `sessions.patch` coming in a future release

### Chore

- Removed unused dependencies: `@tanstack/react-router-devtools`, `@tanstack/react-router-ssr-query`, `vite-plugin-pwa`, `web-vitals`

## [1.8.7] - 2026-03-07

### Performance

- ⚡ **Android PWA overhaul** — Major performance improvements for mobile devices, especially mid-range Android phones.
- 🚀 **Streaming polling reduced 13×** — History polling during SSE streaming reduced from 150ms (6.6 req/s) to 2000ms (0.5 req/s). SSE handles real-time deltas; polling is now just a safety net. Dramatically reduces CPU, GC pressure, and battery drain on mobile.
- 🎨 **Render-blocking fonts removed** — Eliminated external Google Fonts `@import` that blocked first paint by 200-800ms on slow connections. The system font stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`) is now used by default.
- 🧊 **Frost theme optimized for mobile** — Reduced `backdrop-filter` blur from 20px to 8px on touch devices with increased panel opacity. Prevents GPU-intensive real-time blur calculations that dropped frame rates to ~20fps on Android.
- 💡 **Deferred syntax highlighting** — Shiki code highlighting is now skipped during active streaming and only applied once the response settles. Eliminates jank when streaming code-heavy responses.
- 🧩 **Lazy-loaded secondary UI** — Follow-up suggestions, thinking indicators, and search source badges are now lazy-loaded, reducing initial render cost.
- 📦 **CSS containment** — Added `contain: content` to message items and GPU compositing hints to scroll containers for smoother scrolling.
- 🖼️ **Image optimization** — Memoized base64 data URI assembly and added `fetchPriority="low"` to inline message images.
- 🔍 **Search sources debounced** — `aggregatedSearchSources` computation narrowed to only recompute on actual message changes, not during streaming churn.

## [1.8.6] - 2026-03-07

### Fixed

- 🔌 **Duplicate WebSocket connections fix** — Fixed a Vite SSR issue where multiple `node:vm` contexts each created their own WebSocket connection, causing doubled/tripled streaming text. Singleton carrier moved from `globalThis` to `process` which is shared across all VM contexts.
- 🔌 **Stale WebSocket cleanup** — New connections now properly close any existing stale WebSocket before reconnecting, preventing ghost connections from accumulating.

## [1.8.5] - 2026-03-03

### Fixed

- 🔐 **Proper device pairing flow** — OpenCami now connects with correct scopes (`operator.admin`, `operator.approvals`, `operator.pairing`) matching the OpenClaw SDK standard. No more `allowInsecureAuth: true` required.
- 🔐 **deviceToken storage** — After successful pairing, OpenCami stores a device-specific token and uses it for future connections. No shared gateway token needed after first pair.
- 🔐 **Pending state detection** — `/api/ping` now returns `deviceId` and `isPending` fields. If device is awaiting gateway approval, a helpful `approveCommand` is included in the response.

## [1.8.4] - 2026-03-03

### Security

- 🔒 **Command injection fix** — Skills API (`/api/skills`) replaced `execSync` string interpolation with `execFile` + argument arrays. User input is never passed through a shell string. Input validation added for sort, limit, and slug parameters.
- 🔒 **SSRF / API key leak fix** — LLM features API (`/api/llm-features`) now validates `X-LLM-Base-URL` against an allowlist. Server env API keys are never forwarded to untrusted hosts.
- 🔒 **Path traversal consistency** — File info endpoint (`/api/files/info`) now uses the shared `getFileInfo()` helper with consistent jailed path safety, matching the rest of the files API.
- 🔒 **Private cache headers** — File download endpoint (`/api/files/download`) now sends `Cache-Control: private, no-store` for all user workspace files.
- 🔐 **Device auth scope fix** — Gateway connection now requests `operator.admin` scope in addition to `operator.read/write`, enabling full session management without `allowInsecureAuth`.

## [1.9.0] - 2026-02-21

### Added

- 🎨 **Artifacts Preview (Beta)** — Live HTML/SVG preview side panel. When AI generates HTML or SVG code, a "Preview" button appears in the code block toolbar. Click to open a sandboxed preview panel beside the chat. Enable via Settings → Workspace → "Artifacts Preview (Beta)".

## [1.8.3] - 2026-02-23

### Added

- 🔐 **Device Auth (OpenClaw v2026.2.14+)** — OpenCami now performs the Control UI device identity handshake (Ed25519 device identity, signed connect payload, connect.challenge nonce) for remote/Tailnet compatibility.
- 🌐 **Origin allowlist support** — OpenCami server can now send a configurable `Origin` header when opening the Gateway WebSocket (use `OPENCAMI_ORIGIN` or `opencami --origin ...`).
- 🧰 **CLI flags** — `opencami` now supports `--token`, `--password`, and `--origin` to match the installer and simplify setup.

### Fixed

- Remote connect failures like **"origin not allowed"** and **invalid connect params (/device/nonce)** when `dangerouslyDisableDeviceAuth` is disabled.

### Notes

- Optional fallback for older gateways: set `OPENCAMI_DEVICE_AUTH_FALLBACK=1` to retry without device identity.

## [1.8.2] - 2026-02-21

### Fixed

- 🔄 **SSE Streaming** — resolved session key mismatch that caused messages to get stuck on "generating" indefinitely. Stream now starts after `/api/send` response with the correct resolved session key, eliminating race condition on page load.
- 🛠️ **Tool Calls blocking stream** — `streamFinish` now correctly detects the last `assistant` message even when `toolResult` messages follow it, so the generating spinner always clears after tool use.
- ✨ **Follow-up suggestions** — fixed three separate issues: hook now triggers correctly after tool calls; `lastTextAssistantIndex` filters to `role === 'assistant'` only (not `toolResult`); server-side env keys (OpenAI, OpenRouter, Kilocode) used as fallback when no user key is configured.
- 🧹 **Inbound metadata stripping** — OpenClaw metadata prefix (`Conversation info (untrusted metadata): ...`) and timestamps are now stripped from all message rendering paths including chat bubbles, sidebar previews, and all message roles.
- 🔑 **LLM Settings UI** — all configured server-side keys (OpenAI, OpenRouter, Kilocode) now always shown with ✓ regardless of selected provider.
- 🚿 **Service Worker** — replaced with self-unregistering stub; old SW actively unregistered on page load to prevent SSE interception.
- 🔌 **Gateway connection** — stored in `globalThis` to survive Vite HMR reloads without reconnecting.

## [1.8.1] - 2026-02-19

### Enhanced

- 📊 **Dashboard System Stats** — added Load Average (1m/5m/15m), Uptime, Network I/O (RX/TX), Top 5 Processes by CPU, CPU model + core count. Progress bars now color-coded (green/amber/red by usage).
- 🕐 **Dashboard Cron Jobs** — now shows all cron jobs (scrollable list), includes enabled/disabled visual state, and displays total job count in widget header.

## [1.8.0] - 2026-02-19

### Added

- 📊 **Dashboard Panel (Beta)** — New `/dashboard` route with three live widgets: System Stats (CPU, RAM, Disk with progress bars), Gateway Status (active sessions), and Cron Overview (up to 6 jobs with next run time and last status). Auto-refreshes every 10 seconds. Enable via Settings → "Dashboard (Beta)" toggle.

## [1.7.0] - 2026-02-15

### Added

- 📎 **File Attachments** — Upload PDFs, text files, code, CSVs, JSON, and more via attach button or drag & drop. Files uploaded via HTTP to `/uploads/`, agent reads them with `read` tool. Images still use Base64 inline for vision.
- 📄 **File Cards** — Uploaded files render as clickable cards in messages showing filename, icon, and size. Click to open in File Explorer.
- 🖱️ **Drag & Drop** — Drop files onto the composer: images → Base64 (vision), other files → HTTP upload.

### Fixed

- 🧊 **Ice theme** — Always renders as light theme now, regardless of system dark mode setting. CSS media queries and JS theme logic hardened to prevent dark override.
- 📊 **File info endpoint** — `/api/files/info` returns correct file size via `fs.stat()`
- 🎯 **File card false positives** — Regex tightened to only match at start of message, ignores code blocks and quotes.

## [1.6.1] - 2026-02-15

### Fixed

- 🔐 **Gateway scope compatibility** — Request full operator scopes (`operator.read`, `operator.write`, `operator.admin`) for OpenClaw v2026.2.14 compatibility. Without this, sessions and models fail to load.

## [1.6.0] - 2026-02-13

### Added

- 🔧 **Workspace Settings** — Files, Memory, Agents, Skills & Cron toggles under dedicated "Workspace" section in Settings
- 🔔 **Browser Notifications** — Get notified when assistant replies while tab is in background (debounced, permission-aware)
- 🧠 **Memory Viewer** — `/memory` route to browse and edit MEMORY.md and daily memory files with grouped sidebar (Daily / Notes sections)
- 📂 **File Explorer toggle** — controllable via Settings (default: on)
- 🧠 **Memory Viewer toggle** — controllable via Settings (default: on)

### Changed

- File Explorer and Memory Viewer now have visibility toggles in Settings → Workspace
- Memory sidebar sorted: MEMORY.md → Daily files (newest first) → Notes (alphabetical)

### Fixed

- Memory Viewer file paths correctly prefixed for API compatibility

## [1.5.1] - 2026-02-12

### Added

- ⚡ **Lazy-load Shiki** syntax highlighting — Dynamic imports for language grammars
- 🔍 **Promise.allSettled** for global search — Failed session fetches no longer block
- 🔒 **LocalStorage API key warning** — Visible warning in LLM Features settings
- 🧪 **Comprehensive test suite** — 162 Vitest tests across 14 files
- 📚 **Documentation** — API, Architecture, Contributing, Deployment, Features docs

### Fixed

- Streaming race condition improvements
- MCP fully removed from codebase
- Noir theme removed (replaced by Frost Dark)

## [1.5.0] - 2026-02-11

### Added

- 🖥️ **Tauri Desktop App** (Beta) — Native wrapper with tray icon, notifications, auto-start, custom titlebar, multi-window
- 🎨 **Appearance Overhaul** — Frost Light/Dark themes, accent colors (7 options), font family, message density, chat width, bubble style
- 📦 **Skills Browser** (Beta) — Browse, search, and discover skills from ClawHub
- 📄 **FAQ** page

### Changed

- Compact Settings layout, theme labels, reduced fonts, mobile scroll fix, settings polish

### Fixed

- Streaming race condition, bulk delete feedback, search jump to message, Frost Dark CSS, settings dialog width

## [1.4.0] - 2026-02-10

### Added

- 🧩 **Code Block Enhancements** — Line numbers, filename headers, word wrap toggle
- 🤖 **Cron Jobs Panel** (Beta) — Visual cron job manager with execution history
- 🔗 **Smart File Links** — Bare filenames clickable in chat (35+ extensions)
- 📁 **Directory Navigation** — Click directory paths to open File Explorer
- ✏️ **Open in Editor** — File preview has "Open in Editor" button

### Fixed

- Code block rendering (Shiki syntax highlighting)
- Inline file preview after refactor
- File link click crash (nested buttons)
- Horizontal overflow on long content

### Performance

- ⚡ Search optimization — batched requests, progressive results, AbortController
- Overflow hardening across chat, header, sidebar, messages

## [1.3.2] - 2026-02-09

### Added

- 🧠 **Thinking Level Toggle** — Select reasoning depth (off/low/medium/high) per message
- 🔌 **Multi-Provider LLM Features** — Smart Titles & Follow-ups support OpenAI, OpenRouter, Ollama, Custom
- ⚙️ **Settings Sidebar Layout** — Desktop-friendly tabbed navigation
- 🎙️ **Voice Tab** — Merged TTS and STT into single settings section
- 🚀 **Release Automation** — Tag push triggers npm + GitHub Packages + Release

### Changed

- LLM features enabled by default
- Increased token limits for reasoning models
- Added `OPENROUTER_API_KEY` server-side support

### Performance

- Search optimization — batched requests, AbortController cleanup
