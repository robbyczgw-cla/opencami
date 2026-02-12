# Deployment

> Complete self-hosting guide for OpenCami.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation Methods](#installation-methods)
- [Environment Variables](#environment-variables)
- [Reverse Proxy](#reverse-proxy)
- [systemd Service](#systemd-service)
- [Docker](#docker)
- [Tailscale](#tailscale)
- [SSL/TLS](#ssltls)
- [Troubleshooting](#troubleshooting)
- [Updates](#updates)

---

## Prerequisites

### Required

- **Node.js 18+** and npm
- **OpenClaw Gateway** running and accessible
- Gateway authentication (token or password)

### Optional

- Reverse proxy (nginx, Caddy, Traefik)
- Tailscale for secure remote access
- Docker for containerized deployment
- systemd for service management

---

## Quick Start

### npm Global Install (Recommended)

```bash
# Install globally
npm install -g opencami

# Set required environment variables
export CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
export CLAWDBOT_GATEWAY_TOKEN=your_gateway_token_here

# Run
opencami
```

Opens browser automatically at `http://localhost:3000`.

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--port` | HTTP server port | `3000` |
| `--host` | Bind address | `localhost` |
| `--gateway` | Gateway WebSocket URL | `ws://127.0.0.1:18789` |
| `--no-open` | Don't open browser | — |

**Example:**

```bash
opencami --host 0.0.0.0 --port 8080 --no-open
```

---

## Installation Methods

### Method 1: npm Global (Simplest)

```bash
npm install -g opencami
opencami
```

**Pros:** One command, always latest version  
**Cons:** Requires Node.js globally

### Method 2: Repository Clone

```bash
git clone https://github.com/robbyczgw-cla/opencami.git
cd opencami
npm install
npm run build
node bin/opencami.js --host 0.0.0.0 --port 3000 --no-open
```

**Pros:** Full control, easy to modify  
**Cons:** Manual updates

### Method 3: Docker

```bash
docker build -t opencami .
docker run -d -p 3000:3000 \
  -e CLAWDBOT_GATEWAY_URL=ws://host.docker.internal:18789 \
  -e CLAWDBOT_GATEWAY_TOKEN=your_token \
  opencami
```

**Pros:** Isolated, reproducible  
**Cons:** Extra complexity

### Method 4: Vite Dev Server

```bash
git clone https://github.com/robbyczgw-cla/opencami.git
cd opencami
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

**Pros:** Hot reload, great for development  
**Cons:** Not for production

---

## Environment Variables

### Required

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAWDBOT_GATEWAY_URL` | Gateway WebSocket URL | `ws://127.0.0.1:18789` |
| `CLAWDBOT_GATEWAY_TOKEN` | Gateway auth token | — |

**Alternative auth:** Use `CLAWDBOT_GATEWAY_PASSWORD` instead of token.

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `FILES_ROOT` | File explorer root directory | User home |
| `OPENAI_API_KEY` | For LLM features (smart titles, follow-ups) | — |
| `ELEVENLABS_API_KEY` | For premium TTS/STT | — |
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |

### Environment File

Create `.env.local` for local development:

```bash
# Required
CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
CLAWDBOT_GATEWAY_TOKEN=your_token_here

# Optional
FILES_ROOT=/home/user/workspace
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
```

For production, set variables in your service manager or Docker.

---

## Reverse Proxy

### nginx

```nginx
server {
    listen 80;
    server_name opencami.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name opencami.example.com;

    ssl_certificate /etc/letsencrypt/live/opencami.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/opencami.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for SSE
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_cache_bypass $http_upgrade;
        
        # Disable buffering for streaming
        proxy_buffering off;
    }
}
```

### Caddy

```caddy
opencami.example.com {
    reverse_proxy localhost:3000
}
```

Caddy automatically handles HTTPS via Let's Encrypt.

### Traefik

```yaml
# docker-compose.yml with Traefik labels
services:
  opencami:
    image: opencami
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.opencami.rule=Host(`opencami.example.com`)"
      - "traefik.http.routers.opencami.tls=true"
      - "traefik.http.routers.opencami.tls.certresolver=letsencrypt"
      - "traefik.http.services.opencami.loadbalancer.server.port=3000"
```

---

## systemd Service

### Create Service File

```bash
sudo nano /etc/systemd/system/opencami.service
```

```ini
[Unit]
Description=OpenCami Web Client
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/opencami
Environment="NODE_ENV=production"
Environment="CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789"
Environment="CLAWDBOT_GATEWAY_TOKEN=your_token_here"
Environment="FILES_ROOT=/home/user/workspace"
Environment="OPENAI_API_KEY=sk-..."
ExecStart=/usr/bin/node /opt/opencami/bin/opencami.js --host 0.0.0.0 --port 3000 --no-open
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### Enable and Start

```bash
sudo systemctl daemon-reload
sudo systemctl enable opencami
sudo systemctl start opencami
```

### Management Commands

```bash
# Check status
sudo systemctl status opencami

# View logs
sudo journalctl -u opencami -f

# Restart
sudo systemctl restart opencami

# Stop
sudo systemctl stop opencami
```

---

## Docker

### Dockerfile

The repository includes a production Dockerfile:

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "bin/opencami.js", "--host", "0.0.0.0", "--port", "3000", "--no-open"]
```

### Build and Run

```bash
# Build
docker build -t opencami .

# Run
docker run -d \
  --name opencami \
  -p 3000:3000 \
  -e CLAWDBOT_GATEWAY_URL=ws://host.docker.internal:18789 \
  -e CLAWDBOT_GATEWAY_TOKEN=your_token \
  -e FILES_ROOT=/workspace \
  -v /path/to/workspace:/workspace:ro \
  opencami
```

### Docker Compose

```yaml
version: '3.8'

services:
  opencami:
    build: .
    container_name: opencami
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - CLAWDBOT_GATEWAY_URL=ws://gateway:18789
      - CLAWDBOT_GATEWAY_TOKEN=${GATEWAY_TOKEN}
      - FILES_ROOT=/workspace
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./workspace:/workspace:ro
    networks:
      - openclaw

networks:
  openclaw:
    external: true
```

### Docker Network Note

If OpenClaw Gateway runs on the host:
- Use `host.docker.internal` (Docker Desktop)
- Or `--network=host` (Linux)
- Or create a shared Docker network

---

## Tailscale

### Basic Setup

```bash
# On your server
tailscale up

# Serve OpenCami via Tailscale
tailscale serve --bg --https=443 --set-path=/ http://localhost:3000
```

Access via `https://<hostname>.tail<tailnet>.ts.net`

### Funnel (Public Access)

```bash
# Make publicly accessible (requires Tailscale Funnel enabled)
tailscale funnel --bg --https=443 http://localhost:3000
```

### Tailscale + systemd

```ini
[Unit]
Description=OpenCami Web Client
After=network.target tailscaled.service

[Service]
# ... rest of service config
```

---

## SSL/TLS

### Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d opencami.example.com

# Auto-renewal is configured automatically
```

### Self-Signed (Development)

```bash
# Generate self-signed cert
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/opencami.key \
  -out /etc/ssl/certs/opencami.crt
```

---

## Troubleshooting

### Gateway Connection Failed

**Symptoms:** "Gateway connection error" or blank screen

**Checks:**
```bash
# Is Gateway running?
openclaw gateway status

# Can you reach it?
curl -I http://localhost:18789

# Check environment variables
echo $CLAWDBOT_GATEWAY_URL
echo $CLAWDBOT_GATEWAY_TOKEN
```

**Common fixes:**
- Ensure Gateway is running: `openclaw gateway start`
- Verify URL format: `ws://` not `http://`
- Check token/password is correct
- Check firewall rules

### File Explorer Not Showing

**Symptoms:** Files tab missing or empty

**Checks:**
```bash
# Is FILES_ROOT set?
echo $FILES_ROOT

# Does directory exist?
ls -la $FILES_ROOT

# Does the service user have read access?
sudo -u www-data ls $FILES_ROOT
```

**Common fixes:**
- Set `FILES_ROOT` environment variable
- Ensure directory exists and is readable
- Check permissions (service user needs read access)

### LLM Features Not Working

**Symptoms:** Smart titles/follow-ups not generating

**Checks:**
```bash
# Verify API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Common fixes:**
- Set `OPENAI_API_KEY` in environment OR enter in Settings
- Verify key is valid and has credits
- Enable features in Settings → LLM Features

### SSE Streaming Issues

**Symptoms:** Messages appear all at once, not streaming

**Checks:**
- Reverse proxy buffering disabled?
- Long timeouts configured?
- Firewall allowing long-lived connections?

**nginx fix:**
```nginx
proxy_buffering off;
proxy_read_timeout 300s;
```

### Service Won't Start

**Checks:**
```bash
# Check logs
sudo journalctl -u opencami -n 50

# Check permissions
ls -la /opt/opencami
ls -la /opt/opencami/bin/opencami.js

# Test manually
sudo -u www-data node /opt/opencami/bin/opencami.js --help
```

### Memory Issues

For large workspaces or many concurrent users:

```ini
# systemd service
[Service]
Environment="NODE_OPTIONS=--max-old-space-size=1024"
```

---

## Updates

### npm Global

```bash
npm update -g opencami
```

### Repository Clone

```bash
cd /opt/opencami
git pull origin main
npm install
npm run build
sudo systemctl restart opencami
```

### Docker

```bash
docker pull opencami:latest
docker stop opencami
docker rm opencami
docker run -d ... opencami:latest  # Same options as before
```

### Automatic Updates (systemd timer)

```bash
# /etc/systemd/system/opencami-update.service
[Unit]
Description=Update OpenCami

[Service]
Type=oneshot
WorkingDirectory=/opt/opencami
ExecStart=/bin/bash -c 'git pull && npm install && npm run build'
ExecStartPost=/bin/systemctl restart opencami

# /etc/systemd/system/opencami-update.timer
[Unit]
Description=Weekly OpenCami Update

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable opencami-update.timer
sudo systemctl start opencami-update.timer
```

---

## Production Checklist

- [ ] Gateway URL and auth configured
- [ ] Running behind reverse proxy with HTTPS
- [ ] systemd service enabled
- [ ] Log rotation configured
- [ ] Backup strategy for sessions
- [ ] Monitoring/alerting set up
- [ ] Update strategy planned
- [ ] Firewall configured (3000 not public)

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) — Technical deep dive
- [Features](./FEATURES.md) — Feature documentation
- [API Reference](./API.md) — Gateway integration
- [Contributing](./CONTRIBUTING.md) — Development setup
