# Connectivity mental model

Think in two links:

1. **Browser ↔ OpenCami server** (HTTP/HTTPS)
2. **OpenCami server ↔ OpenClaw Gateway** (WS/WSS)

Browser never talks directly to Gateway in normal OpenCami flow.

## Why this matters

Most connection issues are one of these links, not both.

- UI not loading → link #1 issue
- UI loads but chat fails → link #2 issue

## Fast diagnosis

- Check OpenCami URL in browser first.
- Then check gateway env/auth from OpenCami host.
