import http from 'http';
import { URL } from 'url';

import { loadEnv } from './config/env';
import { connectMongo } from './config/mongo';

async function handleLogin(body: unknown): Promise<{ status: number; body: unknown }> {
  const payload = (body as Record<string, unknown>) || {};
  const username = typeof payload['username'] === 'string' ? (payload['username'] as string) : '';
  const password = typeof payload['password'] === 'string' ? (payload['password'] as string) : '';

  if (!username || !password) {
    return { status: 400, body: { error: { code: 400, message: 'Missing username or password' } } };
  }

  // Placeholder authentication: replace with real logic (DB lookup, hashing, etc.)
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return { status: 200, body: { token } };
}

loadEnv();

const PORT = Number(process.env.PORT || 5010);
const ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';

function setCorsHeaders(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalLength = 0;

  for await (const chunk of req) {
    const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalLength += bufferChunk.length;
    if (totalLength > 1_000_000) {
      throw new Error('Payload too large');
    }
    chunks.push(bufferChunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON payload');
  }
}

export async function start(): Promise<void> {
  await connectMongo();

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(res);

    if (!req.url) {
      sendJson(res, 404, { error: { code: 404, message: 'Not found' } });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    try {
      if (url.pathname === '/api/health' && req.method === 'GET') {
        sendJson(res, 200, { ok: true, time: new Date().toISOString() });
        return;
      }

      if (url.pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const result = await handleLogin(body);
        sendJson(res, result.status, result.body);
        return;
      }

      if (url.pathname.startsWith('/api')) {
        sendJson(res, 404, { error: { code: 404, message: 'API route not found' } });
        return;
      }

      sendJson(res, 404, { error: { code: 404, message: 'Route not found' } });
    } catch (error) {
      if (NODE_ENV !== 'production') {
        console.error('[server]', error);
      }
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      const status = message === 'Invalid JSON payload' || message === 'Payload too large' ? 400 : 500;
      sendJson(res, status, { error: { code: status, message } });
    }
  });

  server.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
    console.log(`CORS origin: ${ORIGIN}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
}

export default { start };
