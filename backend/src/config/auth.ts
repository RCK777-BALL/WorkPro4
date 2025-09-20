export interface JwtConfig {
  secret: string;
  refreshSecret?: string;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadJwtConfig(env: NodeJS.ProcessEnv = process.env): JwtConfig {
  const secret = normalize(env.JWT_SECRET);
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required and must not be empty');
  }

  const refreshSecretRaw = env.JWT_REFRESH_SECRET;
  const refreshSecret = refreshSecretRaw === undefined ? undefined : normalize(refreshSecretRaw);

  if (refreshSecretRaw !== undefined && !refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable must not be empty when provided');
  }

  return { secret, refreshSecret };
}

let cachedConfig: JwtConfig | null = null;

export function getJwtConfig(): JwtConfig {
  if (!cachedConfig) {
    cachedConfig = loadJwtConfig();
  }
  return cachedConfig;
}

export function ensureJwtSecrets(options: { requireRefresh?: boolean } = {}): void {
  const config = getJwtConfig();
  if (options.requireRefresh && !config.refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required but was not provided');
  }
}

export function getJwtSecret(): string {
  return getJwtConfig().secret;
}

export function getJwtRefreshSecret(options: { required?: boolean } = {}): string | undefined {
  const refreshSecret = getJwtConfig().refreshSecret;
  if (options.required && !refreshSecret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required but was not provided');
  }
  return refreshSecret;
}

export function resetJwtConfigCache(): void {
  cachedConfig = null;
}
