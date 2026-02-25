# Logs and debugging

## OpenCami process logs

If running manually:

- watch terminal output from `opencami ...`

If using systemd:

```bash
sudo journalctl -u opencami -f
```

## What to look for

- `WS open error: ...`
- `OpenClaw did not send connect.challenge nonce in time...`
- `missing required scope: operator.read`
- `Missing gateway auth...`

## Gateway side

Also inspect OpenClaw logs/status:

```bash
openclaw gateway status
```

## Browser side

- Open devtools console/network for UI-only issues.
- If UI stale after deploy, hard refresh to clear old assets.
