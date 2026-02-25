# Security basics

Practical defaults for safe deployments.

## 1) Prefer token auth

Use `CLAWDBOT_GATEWAY_TOKEN` over password where possible.

## 2) Use TLS for remote browser access

- Browser-facing OpenCami should be `https://...`
- Remote Gateway links should be `wss://...` unless isolated private network hop

## 3) Keep origin allowlist tight

In OpenClaw gateway config, set exact origins only:

```json
{
  "gateway": {
    "controlUi": {
      "allowedOrigins": ["https://opencami.example.com"]
    }
  }
}
```

Then set the same exact value in OpenCami:

```bash
OPENCAMI_ORIGIN=https://opencami.example.com
```

## 4) Avoid fallback unless necessary

`OPENCAMI_DEVICE_AUTH_FALLBACK=true` is a compatibility escape hatch, not a permanent baseline.

## 5) Keep exposure minimal

- Don’t expose OpenCami directly without TLS/access controls.
- Keep Gateway non-public when possible.
- Prefer private network paths (Tailnet, VPN, private subnet).
