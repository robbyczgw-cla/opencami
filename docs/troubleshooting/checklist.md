# Quick checklist

Run these on the OpenCami host.

## 1) Gateway status

```bash
openclaw gateway status
```

## 2) Verify env

```bash
echo "$CLAWDBOT_GATEWAY_URL"
echo "$CLAWDBOT_GATEWAY_TOKEN"
echo "$OPENCAMI_ORIGIN"
```

## 3) URL sanity

- Gateway URL is `ws://` or `wss://`
- Not `http://` / `https://`

## 4) Origin sanity (remote HTTPS)

- `gateway.controlUi.allowedOrigins` contains exact browser origin
- `OPENCAMI_ORIGIN` exactly matches that origin

## 5) Retry with explicit CLI

```bash
opencami --gateway "$CLAWDBOT_GATEWAY_URL" --token "$CLAWDBOT_GATEWAY_TOKEN"
```

## 6) If strict device-auth fails

```bash
export OPENCAMI_DEVICE_AUTH_FALLBACK=true
```

(temporary compatibility mode)
