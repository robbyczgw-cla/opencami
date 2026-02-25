# CLI reference

`opencami` executable options.

## Usage

```bash
opencami [--port <n>] [--host <addr>] [--gateway <ws(s)://...>] [--token <token>] [--password <pw>] [--origin <url>] [--no-open]
```

## Options

| Flag | Description | Default |
|---|---|---|
| `--port <n>` | HTTP listen port | `3000` |
| `--host <addr>` | Bind address | `127.0.0.1` |
| `--gateway <url>` | Gateway WebSocket URL | `ws://127.0.0.1:18789` |
| `--token <token>` | Sets `CLAWDBOT_GATEWAY_TOKEN` | unset |
| `--password <pw>` | Sets `CLAWDBOT_GATEWAY_PASSWORD` | unset |
| `--origin <url>` | Sets `OPENCAMI_ORIGIN` | unset |
| `--no-open` | Do not auto-open browser | off |
| `-h, --help` | Show help | — |

## Examples

```bash
# local default
opencami --gateway ws://127.0.0.1:18789 --token <TOKEN>

# bind all interfaces (for reverse proxy)
opencami --host 0.0.0.0 --port 3000 --gateway wss://gateway.example.com --token <TOKEN> --no-open
```
