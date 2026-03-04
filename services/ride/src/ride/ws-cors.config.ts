import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEV_LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

export function parseWsCorsOrigins(value?: string): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function isWsOriginAllowed(origin: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!origin) return true;

  const allowlist = parseWsCorsOrigins(env.WS_CORS_ORIGINS);
  if (allowlist.length > 0) return allowlist.includes(origin);

  const isProduction = (env.NODE_ENV ?? 'development') === 'production';
  if (isProduction) return false;

  return DEV_LOCALHOST_PATTERN.test(origin);
}

/**
 * Builds socket CORS options from environment with a secure production default.
 */
export function getWsCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  return {
    origin: (origin, callback) => {
      const allowed = isWsOriginAllowed(origin, env);
      callback(allowed ? null : new Error('WS CORS origin denied'), allowed);
    },
    credentials: true,
  };
}
