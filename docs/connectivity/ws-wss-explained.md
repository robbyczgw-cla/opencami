# WS vs WSS explained

OpenCami’s `--gateway` / `CLAWDBOT_GATEWAY_URL` must be WebSocket URLs.

## Rules of thumb

- Local machine / private loopback: `ws://127.0.0.1:18789`
- Remote over TLS (internet/Tailnet HTTPS endpoint): `wss://host...`
- Do **not** use `http://` or `https://` for gateway URL.

## Examples

```bash
# local-local
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789

# remote gateway over TLS
CLAWDBOT_GATEWAY_URL=wss://openclaw-server.tail1234.ts.net
```
