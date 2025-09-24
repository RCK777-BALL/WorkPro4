import { createHmac } from 'crypto';

type ExpiresIn = `${number}${'s' | 'm' | 'h' | 'd'}` | number;

interface SignOptions {
  expiresIn?: ExpiresIn;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=+$/u, '')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_');
}

function parseExpiresIn(expiresIn: ExpiresIn | undefined): number | undefined {
  if (expiresIn === undefined) {
    return undefined;
  }

  if (typeof expiresIn === 'number') {
    return expiresIn;
  }

  const match = /^([0-9]+)([smhd])$/u.exec(expiresIn);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 60 * 60 * 24;
    default:
      return undefined;
  }
}

export function sign(payload: Record<string, unknown>, secret: string, options: SignOptions = {}): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresInSeconds = parseExpiresIn(options.expiresIn) ?? 0;
  const dataPayload: Record<string, unknown> = { ...payload };

  if (expiresInSeconds > 0) {
    dataPayload.exp = issuedAt + expiresInSeconds;
    dataPayload.iat = issuedAt;
  }

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(dataPayload));
  const content = `${encodedHeader}.${encodedPayload}`;

  const signature = createHmac('sha256', secret).update(content).digest();
  const encodedSignature = base64Url(signature);

  return `${content}.${encodedSignature}`;
}

export default { sign };
