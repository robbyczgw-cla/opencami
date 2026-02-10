# OpenCami FAQ

Welcome! This FAQ covers the most common OpenCami questions, from first-time setup to troubleshooting and contributing.

## Table of Contents

- [General](#general)
- [Setup & Installation](#setup--installation)
- [Features](#features)
- [Desktop App (Tauri)](#desktop-app-tauri)
- [Mobile / PWA](#mobile--pwa)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## General

<details>
<summary><strong>What is OpenCami?</strong></summary>

OpenCami is a modern web client for OpenClaw. It gives you a polished chat UI with real-time streaming, model switching, search, voice features, and productivity tools. Think of it as the friendly interface layer for your OpenClaw-powered workflows.

</details>

<details>
<summary><strong>What is OpenClaw? How do they relate?</strong></summary>

OpenClaw is the backend/gateway and agent runtime, while OpenCami is the frontend you use in your browser (or desktop wrapper). OpenCami connects to an OpenClaw gateway over WebSocket and renders chats, tools, sessions, and settings. In short: OpenClaw does the heavy lifting; OpenCami makes it easy to use.

</details>

<details>
<summary><strong>Is OpenCami free / open source?</strong></summary>

Yes — OpenCami is open source and MIT licensed. You can self-host it, modify it, and contribute improvements through GitHub. Some optional integrations (like certain AI or voice providers) may require their own paid API keys.

</details>

<details>
<summary><strong>What's the difference between OpenCami and WebClaw?</strong></summary>

WebClaw is the upstream base project; OpenCami is an extended, feature-rich fork built on top of it. OpenCami adds enhancements like smart titles/follow-ups, file explorer improvements, stronger organization tools, PWA support, and more customization. If you want a power-user experience, OpenCami is the expanded option.

</details>

## Setup & Installation

<details>
<summary><strong>How do I install OpenCami?</strong></summary>

The quickest path is:
`npm install -g opencami` then `opencami`. For development or self-hosting from source, clone the repo, run `npm install`, and start with `npm run dev` (or build with `npm run build`).

</details>

<details>
<summary><strong>What are the prerequisites?</strong></summary>

You need Node.js 18+ and npm. You also need a reachable OpenClaw gateway, plus gateway auth via token or password. For optional smart/voice features, configure provider API keys as needed.

</details>

<details>
<summary><strong>How do I connect to my OpenClaw gateway?</strong></summary>

Set `CLAWDBOT_GATEWAY_URL` to your gateway URL (for example `ws://127.0.0.1:18789`) and provide auth via `CLAWDBOT_GATEWAY_TOKEN` or `CLAWDBOT_GATEWAY_PASSWORD`. If you use the CLI, you can also pass `--gateway`, but setting `CLAWDBOT_GATEWAY_URL` explicitly is the most reliable deployment setup.

</details>

<details>
<summary><strong>Can I run OpenCami without OpenClaw?</strong></summary>

Not as a functional chat client. OpenCami depends on OpenClaw as its backend for sessions, models, and agent interaction. You can load the UI shell, but core chat behavior requires a connected gateway.

</details>

<details>
<summary><strong>Docker setup?</strong></summary>

Yes, a Dockerfile is included. Build with `docker build -t opencami .` and run with `docker run -p 3000:3000 -e CLAWDBOT_GATEWAY_URL=... -e CLAWDBOT_GATEWAY_TOKEN=... opencami`. If your gateway runs on the host, `host.docker.internal` is a common URL target.

</details>

## Features

<details>
<summary><strong>How do I switch AI models?</strong></summary>

Use the model selector in the chat composer. OpenCami loads available models from your gateway config and applies your choice per message. It also remembers your selection so you don’t need to reselect constantly.

</details>

<details>
<summary><strong>How do I use voice input/output (TTS/STT)?</strong></summary>

Use the speaker icon on AI messages for TTS playback and the microphone button in the composer for STT input. In Settings, choose providers (Auto, ElevenLabs/OpenAI, and free fallbacks like Edge TTS or Browser Speech). If premium providers are unavailable, OpenCami falls back automatically where possible.

</details>

<details>
<summary><strong>What are Smart Titles / Smart Follow-ups?</strong></summary>

Smart Titles generate better conversation names than generic timestamps. Smart Follow-ups suggest useful next questions after each response. Both use LLM-based logic with fallback behavior and can be toggled in Settings.

</details>

<details>
<summary><strong>How do I use the File Explorer?</strong></summary>

Open the File Explorer route from the UI and browse inside your configured root. You can upload, download, rename, delete, and edit many text file types directly in-browser. For security, access is path-jailed to `FILES_ROOT` with symlink escape protection.

</details>

<details>
<summary><strong>How do I change the theme / font / text size / density?</strong></summary>

Open Settings to switch theme (light/dark/system) and text size (S/M/L/XL). OpenCami persists these preferences in local storage, so they stay across reloads. Density and related visual preferences are managed through the same settings-driven UX where available.

</details>

<details>
<summary><strong>What are personas?</strong></summary>

Personas are pre-defined AI behavior styles (for example domain-focused assistant modes) you can activate quickly. OpenCami integrates with the Personas skill and can send persona commands from the UI. If the skill is missing, OpenCami can detect that and guide you.

</details>

<details>
<summary><strong>How does the Agent Manager work?</strong></summary>

The Agent Manager is a sidebar panel for managing agents without leaving the chat interface. It supports common management actions like creating, editing, and organizing agent entries. This keeps multi-agent workflows much more discoverable than command-only usage.

</details>

<details>
<summary><strong>What is the Cron Jobs Panel?</strong></summary>

OpenCami organizes cron/isolated sessions in dedicated sidebar folders, so scheduled activity is easier to spot and review. Depending on your gateway setup, these sessions reflect automated jobs and their outputs. It’s mainly an observability and organization layer over OpenClaw cron behavior.

</details>

## Desktop App (Tauri)

<details>
<summary><strong>What is the desktop app?</strong></summary>

It’s a native desktop wrapper built with Tauri for macOS, Windows, and Linux. It packages OpenCami into a desktop shell with native integrations like tray behavior and notifications. The core experience is still your OpenCami web app.

</details>

<details>
<summary><strong>Is it a standalone app or does it need a server?</strong></summary>

It needs a running OpenCami server endpoint to load. By default, desktop builds target `http://localhost:3003` unless you override it. So it’s “native wrapper + remote/self-hosted web backend,” not a fully standalone offline backend.

</details>

<details>
<summary><strong>How do I build it?</strong></summary>

Install prerequisites (Node.js 18+ and Rust), then run `npm install`, `npm run build`, and `npm run tauri:build`. Build artifacts appear under `src-tauri/target/release/bundle/`. You can also run `npm run tauri:dev` for local GUI development.

</details>

<details>
<summary><strong>How do I set a custom gateway URL?</strong></summary>

At build time, set `OPENCAMI_REMOTE_URL` before `npm run tauri:build`. Example: `OPENCAMI_REMOTE_URL="https://your-server.example.com" npm run tauri:build`. This changes the web endpoint the desktop wrapper loads.

</details>

<details>
<summary><strong>Why is it marked as Beta?</strong></summary>

Because the web app is the primary product focus and the native wrapper is still evolving. Platform-specific packaging and edge-case behavior are actively being refined. Beta labeling sets expectations and encourages feedback from early adopters.

</details>

## Mobile / PWA

<details>
<summary><strong>Can I use OpenCami on my phone?</strong></summary>

Yes. OpenCami is mobile responsive and includes mobile-focused UX improvements like gesture-friendly sidebar behavior. You can use it directly in a mobile browser or install it as a PWA.

</details>

<details>
<summary><strong>How do I install the PWA?</strong></summary>

Open OpenCami in your phone browser and use the browser’s “Add to Home Screen” / “Install App” option. Once installed, it launches like an app with offline shell support and background updates. This works on Android (Chrome) and iOS (Safari) with platform-specific install prompts.

</details>

<details>
<summary><strong>Is there a native mobile app?</strong></summary>

Yes — OpenCami includes a **Capacitor-based Android app** (source in the `android/` directory). It's currently in **Beta** and not distributed as a pre-built APK. You can build it yourself with `npx cap sync android && npx cap open android`. The recommended mobile path for most users is the **PWA**, which works out of the box on both Android and iOS.

</details>

## Troubleshooting

<details>
<summary><strong>White/blank screen on startup</strong></summary>

Hard refresh first (or clear site data) to rule out stale cached assets, especially after updates. Then check browser console for JavaScript errors and confirm the server is actually running on the expected host/port. If using PWA mode, reinstalling/updating the service worker cache can resolve version mismatches.

</details>

<details>
<summary><strong>Can't connect to gateway</strong></summary>

Verify `CLAWDBOT_GATEWAY_URL` and gateway auth env vars first. Confirm the gateway status with `openclaw gateway status` and ensure the endpoint is reachable from the OpenCami host/container. Also watch server logs for handshake/auth errors.

</details>

<details>
<summary><strong>Voice features not working</strong></summary>

Check Settings for selected TTS/STT provider and confirm any required API keys are present. Browser permissions (microphone/audio autoplay) can also block voice features, so re-check site permissions. If premium providers fail, switch provider mode to Auto or free fallbacks.

</details>

<details>
<summary><strong>Search not returning results</strong></summary>

Make sure you’re searching the right scope (current chat vs global search). Very new or empty sessions naturally produce few matches, so test with known terms from older messages. If results still fail, reload and inspect console/network errors for index/query issues.

</details>

## Contributing

<details>
<summary><strong>How do I contribute?</strong></summary>

Fork the repo, create a branch, make focused changes, and open a PR with a clear description. For local work: clone, `npm install`, and `npm run dev`. Small, testable improvements and good docs updates are always welcome.

</details>

<details>
<summary><strong>What's the tech stack?</strong></summary>

OpenCami uses React 18 with Vite, TanStack Router/Start, TanStack Query, and Tailwind CSS. It relies on OpenClaw gateway communication over WebSocket with SSE streaming to the browser. The desktop wrapper is built with Tauri v2.

</details>

<details>
<summary><strong>How do I report bugs?</strong></summary>

Open an issue on GitHub with reproduction steps, expected vs actual behavior, and logs/screenshots when possible. Include your environment (browser/OS, OpenCami version, deployment mode, gateway config style). Clear bug reports dramatically speed up fixes.

</details>
