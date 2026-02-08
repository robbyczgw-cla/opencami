# Deployment

## Self-Hosting

### Prerequisites
- Node.js 18+ and npm
- OpenClaw Gateway running and reachable
- (Optional) Reverse proxy (nginx, Caddy, Tailscale Serve)

### Production Build

```bash
git clone https://github.com/robbyczgw-cla/opencami.git
cd opencami
npm install
npm run build
```

Build output is generated in `dist/`:
- `dist/client` — static client assets
- `dist/server/server.js` — server handler used by the CLI runtime

### Environment Variables

Create a `.env` file (or set variables in your service manager):

#### Required (server runtime)
```bash
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=your_gateway_token_here
# Alternative auth:
# CLAWDBOT_GATEWAY_PASSWORD=your_gateway_password
```

#### Optional
```bash
# File explorer root directory
FILES_ROOT=/path/to/workspace

# OpenAI API key for LLM features (smart titles, smart follow-ups)
OPENAI_API_KEY=sk-...
```

### Important env alias note
- OpenCami server code reads `CLAWDBOT_GATEWAY_URL`.
- The `opencami --gateway ...` CLI currently exports `OPENCLAW_GATEWAY`.
- For reliable deployments, set `CLAWDBOT_GATEWAY_URL` explicitly.

## Running in Production

### Option 1: OpenCami CLI (recommended)

```bash
npm install -g opencami
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789 \
CLAWDBOT_GATEWAY_TOKEN=your_token \
opencami --host 0.0.0.0 --port 3000 --no-open
```

### Option 2: Run from repository checkout

```bash
npm run build
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789 \
CLAWDBOT_GATEWAY_TOKEN=your_token \
node bin/opencami.js --host 0.0.0.0 --port 3000 --no-open
```

### Option 3: systemd service

Create `/etc/systemd/system/opencami.service`:

```ini
[Unit]
Description=OpenCami Web Client
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/opencami
Environment="CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789"
Environment="CLAWDBOT_GATEWAY_TOKEN=your_token_here"
Environment="FILES_ROOT=/home/user/workspace"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/opencami/bin/opencami.js --host 0.0.0.0 --port 3000 --no-open
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable opencami
sudo systemctl start opencami
sudo systemctl status opencami
```

Logs:

```bash
sudo journalctl -u opencami -f
```

## Reverse Proxy

### nginx

```nginx
server {
    listen 80;
    server_name opencami.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

### Caddy

```caddy
opencami.example.com {
    reverse_proxy localhost:3000
}
```

### Tailscale Serve

```bash
tailscale serve --bg --https=443 --set-path=/ http://localhost:3000
```

## Docker

A Dockerfile is included in the repository.

```bash
docker build -t opencami .
docker run -d \
  -p 3000:3000 \
  -e CLAWDBOT_GATEWAY_URL=ws://host.docker.internal:18789 \
  -e CLAWDBOT_GATEWAY_TOKEN=your_token \
  opencami
```

## Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLAWDBOT_GATEWAY_URL` | ✅ | `ws://127.0.0.1:18789` | OpenClaw Gateway WebSocket URL used by server code |
| `CLAWDBOT_GATEWAY_TOKEN` | ✅* | — | Recommended gateway auth token |
| `CLAWDBOT_GATEWAY_PASSWORD` | ✅* | — | Alternative auth if token is not used |
| `OPENCLAW_GATEWAY` | ❌ | — | CLI-set variable from `--gateway`; not the primary server env key |
| `FILES_ROOT` | ❌ | — | Root directory for file explorer. If unset, defaults to user home |
| `OPENAI_API_KEY` | ❌ | — | API key for LLM features |
| `PORT` | ❌ | `3000` | HTTP server port when running `bin/opencami.js` |

\* One of `CLAWDBOT_GATEWAY_TOKEN` or `CLAWDBOT_GATEWAY_PASSWORD` is required.

## Troubleshooting

### Gateway connection failed
- Verify `CLAWDBOT_GATEWAY_URL`
- Ensure Gateway is running: `openclaw gateway status`
- Ensure auth is set (`CLAWDBOT_GATEWAY_TOKEN` or `CLAWDBOT_GATEWAY_PASSWORD`)

### File explorer not showing
- Set `FILES_ROOT`
- Ensure the directory exists and is readable

### LLM features not working
- Set `OPENAI_API_KEY` or enter key in Settings
- Verify key: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

## Updates

```bash
cd /opt/opencami
git pull origin main
npm install
npm run build
sudo systemctl restart opencami
```
