# Health checks

Use this short routine for ongoing reliability.

## Daily/regular checks

```bash
openclaw gateway status
```

Verify OpenCami can still connect and send a test prompt.

## Config drift checks

- `CLAWDBOT_GATEWAY_URL` still correct
- token not expired/rotated without update
- `OPENCAMI_ORIGIN` still matches deployed browser URL

## After infra changes

Re-test:

1. DNS/hostname changes
2. reverse proxy changes
3. TLS certificate renewal/migration
4. firewall changes

## Optional lightweight script idea

- check process alive
- hit `/api/ping`
- alert on non-200/timeout
