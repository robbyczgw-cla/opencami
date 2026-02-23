#!/usr/bin/env node

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';

const __dirname = fileURLToPath(new URL('..', import.meta.url));

// Parse args
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  return args[i + 1] || def;
}
const port = parseInt(getArg('port', '3000'), 10);
const host = getArg('host', '127.0.0.1');
const gateway = getArg('gateway', 'ws://127.0.0.1:18789');
const token = getArg('token', '');
const password = getArg('password', '');
const origin = getArg('origin', '');
const noOpen = args.includes('--no-open');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  opencami - Web UI for OpenClaw

  Usage: opencami [options]

  Options:
    --port <n>        Port to listen on (default: 3000)
    --host <addr>     Host to bind to (default: 127.0.0.1)
    --gateway <url>   OpenClaw gateway URL (default: ws://127.0.0.1:18789)
    --token <token>   Gateway token (sets CLAWDBOT_GATEWAY_TOKEN)
    --password <pw>   Gateway password (sets CLAWDBOT_GATEWAY_PASSWORD)
    --origin <url>    Origin to send in backend WS (sets OPENCAMI_ORIGIN)
    --no-open         Don't open browser on start
    -h, --help        Show this help
`);
  process.exit(0);
}

// Set gateway env for the app
process.env.CLAWDBOT_GATEWAY_URL = gateway;
if (token) process.env.CLAWDBOT_GATEWAY_TOKEN = token;
if (password) process.env.CLAWDBOT_GATEWAY_PASSWORD = password;
if (origin) process.env.OPENCAMI_ORIGIN = origin;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

const clientDir = join(__dirname, 'dist', 'client');

async function serveStatic(pathname) {
  const filePath = join(clientDir, pathname);
  // Prevent path traversal
  if (!filePath.startsWith(clientDir)) return null;
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return null;
    const data = await readFile(filePath);
    const ext = extname(filePath);
    return { data, mime: MIME_TYPES[ext] || 'application/octet-stream' };
  } catch {
    return null;
  }
}

// Import the TanStack Start server
const { default: server } = await import(join(__dirname, 'dist', 'server', 'server.js'));

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Try static files first
  const staticFile = await serveStatic(url.pathname);
  if (staticFile) {
    res.writeHead(200, { 'Content-Type': staticFile.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.end(staticFile.data);
    return;
  }

  // Forward to SSR handler
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }

    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? await new Promise((resolve, reject) => {
          const chunks = [];
          req.on('data', c => chunks.push(c));
          req.on('end', () => resolve(Buffer.concat(chunks)));
          req.on('error', reject);
        })
      : undefined;

    const request = new Request(url.href, {
      method: req.method,
      headers,
      body,
      duplex: 'half',
    });

    const response = await server.fetch(request);

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

    if (response.body) {
      const reader = response.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          res.write(value);
        }
      };
      pump().catch(() => res.end());
    } else {
      const buf = await response.arrayBuffer();
      res.end(Buffer.from(buf));
    }
  } catch (err) {
    console.error('Request error:', err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

httpServer.listen(port, host, () => {
  const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
  console.log();
  console.log('  🐾 \x1b[1mOpenCami\x1b[0m');
  console.log();
  console.log(`  ➜  Local:   \x1b[36m${url}\x1b[0m`);
  console.log(`  ➜  Gateway: \x1b[33m${gateway}\x1b[0m`);
  console.log();

  if (!noOpen) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} ${url}`, () => {});
  }
});
