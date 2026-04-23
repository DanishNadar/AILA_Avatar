import http from 'node:http';
import { readFileSync, existsSync, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import chatHandler from './api/chat.js';
import healthHandler from './api/health.js';
import transcribeHandler from './api/transcribe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.local'));

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function attachHelpers(res) {
  res.status = code => {
    res.statusCode = code;
    return res;
  };

  res.json = payload => {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    res.end(JSON.stringify(payload));
    return res;
  };

  res.send = payload => {
    if (typeof payload === 'object' && !Buffer.isBuffer(payload)) {
      return res.json(payload);
    }
    res.end(payload);
    return res;
  };

  return res;
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  req.rawBody = raw;
  req.body = raw ? JSON.parse(raw) : {};
}

function safeJoinPublic(requestPath) {
  const normalized = path.normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  return path.join(publicDir, normalized);
}

async function serveStatic(req, res, requestPath) {
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\//, '');
  const filePath = safeJoinPublic(relativePath);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(publicDir))) {
    return res.status(403).send('Forbidden');
  }

  try {
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) {
      return res.status(404).send('Not found');
    }

    const ext = path.extname(resolved).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    createReadStream(resolved).pipe(res);
  } catch {
    res.status(404).send('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  attachHelpers(res);
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return healthHandler(req, res);
    }

    if (req.method === 'POST' && url.pathname === '/api/chat') {
      await parseJsonBody(req);
      return chatHandler(req, res);
    }

    if (req.method === 'POST' && url.pathname === '/api/transcribe') {
      return transcribeHandler(req, res);
    }

    if (req.method === 'GET') {
      return serveStatic(req, res, url.pathname);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Local server error' });
  }
});

const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`AILA local server running at http://localhost:${port}`);
});
