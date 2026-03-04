import { getWsCorsOptions, isWsOriginAllowed, parseWsCorsOrigins } from './ws-cors.config';

describe('ws cors config', () => {
  it('allows origin present in WS_CORS_ORIGINS', () => {
    const env = {
      NODE_ENV: 'production',
      WS_CORS_ORIGINS: 'https://zippy.com.ar,https://admin.zippy.com.ar',
    } as NodeJS.ProcessEnv;

    expect(isWsOriginAllowed('https://zippy.com.ar', env)).toBe(true);
  });

  it('denies origin not present in WS_CORS_ORIGINS', () => {
    const env = {
      NODE_ENV: 'production',
      WS_CORS_ORIGINS: 'https://zippy.com.ar,https://admin.zippy.com.ar',
    } as NodeJS.ProcessEnv;

    expect(isWsOriginAllowed('https://evil.example.com', env)).toBe(false);
  });

  it('allows localhost defaults in development when WS_CORS_ORIGINS is empty', () => {
    const env = {
      NODE_ENV: 'development',
      WS_CORS_ORIGINS: '',
    } as NodeJS.ProcessEnv;

    expect(isWsOriginAllowed('http://localhost:3000', env)).toBe(true);
    expect(isWsOriginAllowed('http://127.0.0.1:5173', env)).toBe(true);
  });

  it('denies all browser origins in production when WS_CORS_ORIGINS is empty', () => {
    const env = {
      NODE_ENV: 'production',
      WS_CORS_ORIGINS: '',
    } as NodeJS.ProcessEnv;

    expect(isWsOriginAllowed('https://zippy.com.ar', env)).toBe(false);
  });

  it('keeps callback-based cors decision testable', () => {
    const env = {
      NODE_ENV: 'production',
      WS_CORS_ORIGINS: 'https://zippy.com.ar',
    } as NodeJS.ProcessEnv;

    const opts = getWsCorsOptions(env);
    const originCheck = opts.origin as (origin: string, callback: (err: Error | null, allow?: boolean) => void) => void;

    let deniedErr: Error | null = null;
    originCheck('https://denied.com', (err) => {
      deniedErr = err;
    });
    expect(deniedErr).toBeInstanceOf(Error);

    let allowedErr: Error | null = new Error('preset');
    originCheck('https://zippy.com.ar', (err) => {
      allowedErr = err;
    });
    expect(allowedErr).toBeNull();
  });

  it('parses WS_CORS_ORIGINS CSV values', () => {
    expect(parseWsCorsOrigins(' https://a.com, ,https://b.com ')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });
});
