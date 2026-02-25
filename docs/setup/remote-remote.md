# Setup: remote OpenCami + remote Gateway

Yes — **this is supported**.

This means both OpenCami and Gateway run on remote infrastructure (same host or different hosts), and you access OpenCami from your browser over HTTPS.

## Recommended topology

- Browser → `https://opencami.example.com`
- OpenCami server → Gateway via `wss://gateway.example.com` (or internal `ws://` inside private network)

## Prerequisites

1. OpenCami server can reach Gateway network endpoint.
2. OpenCami has auth (`CLAWDBOT_GATEWAY_TOKEN` recommended).
3. If gateway origin allowlist is enabled, browser origin is allowlisted exactly:
   - OpenClaw config: `gateway.controlUi.allowedOrigins`
   - OpenCami env: `OPENCAMI_ORIGIN` set to same exact origin
4. TLS is configured for public/remote browser access.

## Minimal env example

```bash
CLAWDBOT_GATEWAY_URL=wss://gateway.example.com
CLAWDBOT_GATEWAY_TOKEN=<GATEWAY_TOKEN>
OPENCAMI_ORIGIN=https://opencami.example.com
```

## Typical deployment flow

1. Start OpenCami behind reverse proxy/TLS.
2. Set the three env vars above.
3. Add OpenCami browser origin to gateway `allowedOrigins`.
4. Restart gateway: `openclaw gateway restart`.
5. Open OpenCami URL and test chat.

## Common failure modes

- **Origin not allowed**: exact mismatch (`https`, host, port, trailing slash).
- **Gateway reachable but auth fails**: wrong/expired token or wrong auth mode.
- **Gateway URL scheme mismatch**: `https://` accidentally used instead of `wss://`.
- **Handshake nonce timeout** (`connect.challenge` not seen): often origin/edge proxy issue.
- **Missing `operator.read` scope**: token authenticated but lacks needed operator permissions.

## Compatibility fallback (only when needed)

If strict device-auth handshake fails in your environment:

```bash
OPENCAMI_DEVICE_AUTH_FALLBACK=true
```

Use as temporary compatibility mode; keep strict mode as default.
