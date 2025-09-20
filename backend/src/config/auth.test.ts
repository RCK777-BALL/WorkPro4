import { describe, expect, it } from 'vitest';
import { loadJwtConfig } from './auth';

describe('loadJwtConfig', () => {
  it('throws an error when JWT_SECRET is missing', () => {
    const env = { ...process.env } as NodeJS.ProcessEnv;
    delete env.JWT_SECRET;

    expect(() => loadJwtConfig(env)).toThrowError('JWT_SECRET environment variable is required and must not be empty');
  });
});
