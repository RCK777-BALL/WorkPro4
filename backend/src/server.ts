import http from 'http';
import { URL } from 'url';

import { loadEnv } from './config/env';
import { connectMongo } from './config/mongo';

type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
};

const activeSessions = new Map<string, AuthUser>();

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/=+$/u, '');
}

function buildUserProfile(identifier: string): AuthUser {
  const email = identifier.includes('@') ? identifier.toLowerCase() : `${identifier.toLowerCase()}@example.com`;
  const namePart = email.split('@')[0] ?? 'user';
  const name = namePart
    .split(/[._\-\s]+/u)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'Demo User';
  const now = new Date().toISOString();

  return {
    id: `user-${toBase64Url(email).slice(0, 16)}`,
    tenantId: 'tenant-demo',
    email,
    name,
    role: 'user',
    createdAt: now,
    updatedAt: now,
  } satisfies AuthUser;
}

function decodeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [identifier] = decoded.split(':');
    return identifier?.trim() || null;
  } catch {
    return null;
  }
}

function buildError(status: number, message: string, details?: unknown) {
  return {
    status,
    body: {
      data: null,
      error: {
        code: status,
        message,
        details,
      },
    },
  };
}

async function handleLogin(body: unknown): Promise<{ status: number; body: unknown }> {
  const payload = (body as Record<string, unknown>) || {};
  const identifierRaw =
    (typeof payload['email'] === 'string' ? payload['email'] : undefined) ??
    (typeof payload['username'] === 'string' ? payload['username'] : undefined) ??
    '';
  const identifier = identifierRaw.trim();
  const password = typeof payload['password'] === 'string' ? payload['password'].trim() : '';

  if (!identifier || !password) {
    return buildError(400, 'Missing email/username or password');
  }

  const token = Buffer.from(`${identifier}:${password}`).toString('base64');
  const user = buildUserProfile(identifier);

  activeSessions.set(token, user);

  return {
    status: 200,
    body: {
      data: {
        token,
        user,
      },
      error: null,
    },
  };
}

function handleAuthMe(token: string | null) {
  if (!token) {
    return buildError(401, 'Unauthorized');
  }

  const sessionUser = activeSessions.get(token);

  if (sessionUser) {
    return {
      status: 200,
      body: { data: sessionUser, error: null },
    };
  }

  const identifier = decodeToken(token);

  if (!identifier) {
    return buildError(401, 'Unauthorized');
  }

  const user = buildUserProfile(identifier);
  activeSessions.set(token, user);

  return {
    status: 200,
    body: { data: user, error: null },
  };
}

function extractBearerToken(req: http.IncomingMessage): string | null {
  const header = req.headers['authorization'];

  if (typeof header !== 'string') {
    return null;
  }

  const [scheme, value] = header.split(' ');

  if (!scheme || !value || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return value.trim() || null;
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

      if (url.pathname === '/api/auth/me' && req.method === 'GET') {
        const token = extractBearerToken(req);
        const result = handleAuthMe(token);
        sendJson(res, result.status, result.body);
        return;
      }

      if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
        const token = extractBearerToken(req);
        if (token) {
          activeSessions.delete(token);
        }

        sendJson(res, 200, { data: { success: true }, error: null });
        return;
      }

      if (url.pathname.startsWith('/api')) {
        const result = buildError(404, 'API route not found');
        sendJson(res, result.status, result.body);
        return;
      }

      const result = buildError(404, 'Route not found');
      sendJson(res, result.status, result.body);
    } catch (error) {
      if (NODE_ENV !== 'production') {
        console.error('[server]', error);
      }
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      const status = message === 'Invalid JSON payload' || message === 'Payload too large' ? 400 : 500;
      const result = buildError(status, message);
      sendJson(res, result.status, result.body);
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
