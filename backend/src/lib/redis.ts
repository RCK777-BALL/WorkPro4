import IORedis, { Redis, RedisOptions } from 'ioredis';

let cachedRedis: Redis | null = null;

export function getRedisUrl(): string | null {
  const raw = process.env.REDIS_URL?.trim();
  return raw && raw.length > 0 ? raw : null;
}

export function getRedisConnection(): Redis | null {
  const url = getRedisUrl();

  if (!url) {
    return null;
  }

  if (cachedRedis) {
    return cachedRedis;
  }

  const options: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  };

  cachedRedis = new IORedis(url, options);
  cachedRedis.on('error', (error) => {
    console.error('[redis] connection error:', error);
  });

  return cachedRedis;
}

export async function closeRedisConnection(): Promise<void> {
  if (!cachedRedis) {
    return;
  }

  const instance = cachedRedis;
  cachedRedis = null;

  try {
    await instance.quit();
  } catch (error) {
    console.error('[redis] error while closing connection', error);
  }
}
