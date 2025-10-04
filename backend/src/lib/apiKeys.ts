import crypto from 'crypto';

const API_KEY_PREFIX = 'wrk';

export interface GeneratedApiKey {
  token: string;
  hash: string;
  prefix: string;
  lastFour: string;
}

export function generateApiKey(): GeneratedApiKey {
  const randomBytes = crypto.randomBytes(32).toString('base64url');
  const token = `${API_KEY_PREFIX}_${randomBytes}`;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const sanitized = token.replace(/[^a-zA-Z0-9]/g, '');
  const prefix = sanitized.slice(0, 8);
  const lastFour = sanitized.slice(-4);

  return { token, hash, prefix, lastFour };
}

export function hashApiKey(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
