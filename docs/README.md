# OpenCami Docs

This is the fastest path from “just installed” to “working reliably”.

## Start here

Pick your deployment shape:

- **[Local OpenCami + local Gateway](./setup/local-local.md)** (recommended default)
- **[Local OpenCami + remote Gateway](./setup/local-remote.md)**
- **[Remote OpenCami + remote Gateway](./setup/remote-remote.md)** (supported)

Then review:

- **[Environment variables](./setup/env-vars.md)**
- **[Security basics](./setup/security-basics.md)**

## Connectivity concepts

- [Mental model](./connectivity/mental-model.md)
- [WS vs WSS explained](./connectivity/ws-wss-explained.md)
- [Origins / allowedOrigins](./connectivity/origins.md)

## Troubleshooting

- [Troubleshooting index](./troubleshooting/index.md)
- [Error identifiers and fixes](./troubleshooting/errors.md)
- [Quick checklist](./troubleshooting/checklist.md)

## Operations

- [Updates](./operations/updates.md)
- [Backups](./operations/backups.md)
- [Logs and debugging](./operations/logs-debugging.md)
- [Health checks](./operations/health-checks.md)

## Reference

- [Config reference](./reference/config-reference.md)
- [CLI reference](./reference/cli-reference.md)
- [FAQ](./reference/faq.md)

---

If you only do one thing: keep Gateway auth configured (`CLAWDBOT_GATEWAY_TOKEN`) and keep origin settings exact (`gateway.controlUi.allowedOrigins` + `OPENCAMI_ORIGIN`) for remote HTTPS setups.
