# Backups

OpenCami itself is mostly stateless UI/server glue, but these are worth backing up:

## 1) OpenCami identity files (for stable device identity)

```text
~/.opencami/identity/device.json
~/.opencami/identity/instance-id.txt
```

## 2) Deployment config

- systemd unit/env files (if used)
- reverse proxy config
- `.env.local` / runtime env definitions

## 3) Gateway/session data

Session history is managed by OpenClaw. Include your OpenClaw backup strategy separately.

## Simple backup example

```bash
tar -czf opencami-backup-$(date +%F).tar.gz \
  ~/.opencami/identity \
  /etc/systemd/system/opencami.service
```

(adjust paths to your deployment)
