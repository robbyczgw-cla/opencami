# Origins and allowedOrigins

For remote browser setups, gateway may enforce origin allowlists.

## What must match exactly

- OpenClaw config: `gateway.controlUi.allowedOrigins[]`
- OpenCami env: `OPENCAMI_ORIGIN`
- Browser origin where you open OpenCami

Exact means same scheme + host + port, and no accidental trailing slash changes.

## Example

```json
{
  "gateway": {
    "controlUi": {
      "allowedOrigins": [
        "https://opencami.example.com"
      ]
    }
  }
}
```

```bash
OPENCAMI_ORIGIN=https://opencami.example.com
```

## Typical errors from mismatch

- “origin not allowed”
- challenge nonce/connect handshake timeout
