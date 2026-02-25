# FAQ

## Is remote-remote supported?

Yes. OpenCami and Gateway can both be remote. Ensure OpenCami can reach Gateway, use proper `wss://` where needed, and align origin allowlist settings.

## Why does UI load but chat cannot connect?

Usually Browser→OpenCami works, but OpenCami→Gateway fails (URL/auth/origin/scope).

## Should I use ws or wss?

- local loopback/private local hop: `ws://`
- remote/TLS endpoint: `wss://`

## I set `--gateway https://...` and it fails

Gateway URL must be WebSocket (`ws://` or `wss://`), not HTTP(S).

## Do I need OPENCAMI_ORIGIN always?

No. It is mainly needed when gateway enforces origin allowlisting for remote browser origins.

## What does `OPENCAMI_DEVICE_AUTH_FALLBACK` do?

If strict device-auth connect fails, OpenCami retries connect without device identity metadata. Keep disabled unless needed.

## Where does OpenCami store identity?

Under:

```text
~/.opencami/identity/device.json
~/.opencami/identity/instance-id.txt
```

## What’s the minimum env setup?

```bash
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=<TOKEN>
```
