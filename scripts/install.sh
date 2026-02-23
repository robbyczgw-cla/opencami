#!/usr/bin/env bash
set -euo pipefail

log() {
  printf '[opencami-install] %s\n' "$*"
}

if ! command -v node >/dev/null 2>&1; then
  echo 'Error: Node.js is required (18+). Install Node.js first: https://nodejs.org/' >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo 'Error: npm is required. Install npm first.' >&2
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 18 ]; then
  echo "Error: Node.js 18+ required (found $(node -v))." >&2
  exit 1
fi

log "Installing latest OpenCami from npm..."
npm install -g opencami

cat <<'EOF'

✅ OpenCami installed.

Next steps (required):
  export CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789
  export CLAWDBOT_GATEWAY_TOKEN=YOUR_GATEWAY_TOKEN

For remote Tailnet + origin allowlist setups:
  1) In OpenClaw config, set gateway.controlUi.allowedOrigins with your exact OpenCami URL
  2) Set OPENCAMI_ORIGIN to that exact same origin, e.g.:
       export OPENCAMI_ORIGIN=https://openclaw-server.tailXXXX.ts.net:3001
  3) Restart gateway:
       openclaw gateway restart

Run OpenCami:
  opencami
EOF
