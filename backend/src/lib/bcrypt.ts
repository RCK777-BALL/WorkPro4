import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);

async function derive(password: string, salt: string): Promise<Buffer> {
  return (await scrypt(password, salt, 64)) as Buffer;
}

export async function hash(password: string, _rounds = 10): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await derive(password, salt);
  return `${salt}:${derived.toString('hex')}`;
}

export function hashSync(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

export async function compare(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) {
    return false;
  }
  const derived = await derive(password, salt);
  const original = Buffer.from(hashHex, 'hex');
  if (original.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(original, derived);
}

export function compareSync(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) {
    return false;
  }
  const derived = scryptSync(password, salt, 64);
  const original = Buffer.from(hashHex, 'hex');
  if (original.length !== derived.length) {
    return false;
  }
  return timingSafeEqual(original, derived);
}

export default {
  hash,
  hashSync,
  compare,
  compareSync,
};
