# Setup: local OpenCami + remote Gateway

Use this when your browser/OpenCami server is local, but Gateway is on another machine.

## Prerequisites

- Remote Gateway reachable from local machine.
- Gateway auth token available.
- If the remote Gateway endpoint is internet/Tailnet TLS, use `wss://`.

## Example

```bash
opencami \
  --gateway wss://openclaw-server.tail1234.ts.net \
  --token <GATEWAY_TOKEN>
```

## When to set OPENCAMI_ORIGIN

If your gateway enforces origin allowlisting for Control UI clients, set `OPENCAMI_ORIGIN` to the exact browser origin where OpenCami is served.

Example (OpenCami local HTTPS reverse proxy):

```bash
export OPENCAMI_ORIGIN=https://my-laptop.tail1234.ts.net:3001
opencami --gateway wss://openclaw-server.tail1234.ts.net --token <GATEWAY_TOKEN>
```

## Common pitfalls

- `https://...` used for `--gateway` (wrong scheme) → must be `wss://...`
- Missing token/password env
- Origin mismatch between `OPENCAMI_ORIGIN` and `gateway.controlUi.allowedOrigins`
