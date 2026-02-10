# Desktop App (Tauri) — ⚠️ Beta

> **This is experimental.** The primary focus of OpenCami is the **web app**. The desktop wrapper is a convenience layer and under active development.

OpenCami includes a native desktop wrapper for macOS, Windows, and Linux using Tauri v2. It loads your self-hosted OpenCami web instance.

## Prerequisites

- Node.js 18+
- Rust toolchain (`rustup`)

## Build

```bash
# Install dependencies (if not already done)
npm install

# Build web assets first
npm run build

# Build desktop app
npm run tauri:build
```

## Custom Gateway URL

By default, the desktop app connects to `http://localhost:3003`.

Override at build time:

```bash
OPENCAMI_REMOTE_URL="https://your-server.example.com" npm run tauri:build
```

## Output

Build artifacts are generated in `src-tauri/target/release/bundle/`:
- macOS: `.app`, `.dmg`
- Windows: `.exe`, `.msi`
- Linux: `.deb`, `.AppImage`

## Features

- Tray icon (hide to tray on close)
- Native notifications
- Auto-start on login
- Custom titlebar
- Multiple windows (⌘N)
- Clipboard integration

## Dev Mode

```bash
npm run tauri:dev
```

Requires a display/GUI environment.
