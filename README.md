# WebClaw

![Cover](./public/cover.webp)

Fast web client for OpenClaw

Currently in beta.

## Setup

Create `.env.local` with `CLAWDBOT_GATEWAY_URL` and either `CLAWDBOT_GATEWAY_TOKEN` (recommended) or `CLAWDBOT_GATEWAY_PASSWORD`. These map to your OpenClaw Gateway auth (`gateway.auth.token` or `gateway.auth.password`). Default URL is `ws://127.0.0.1:18789`. Docs: https://docs.openclaw.ai/gateway

```bash
npm install
npm run dev
```
