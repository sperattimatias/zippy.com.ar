import { AuthService } from './auth.service';

jest.mock('argon2', () => ({
  verify: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed'),
  argon2id: 2,
}));

describe('AuthService', () => {
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('access.jwt.token'),
  } as any;

  const configService = {
    get: jest.fn((key: string, def?: unknown) => {
      const map: Record<string, unknown> = {
        JWT_ACCESS_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_DAYS: 30,
      };
      return map[key] ?? def;
    }),
    getOrThrow: jest.fn(() => '12345678901234567890123456789012'),
  } as any;

  it('refresh rotates token and revokes old one', async () => {
    const prisma = {
      refreshToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'old-token-id',
          token_hash: 'old',
          revoked_at: null,
          expires_at: new Date(Date.now() + 100000),
          user: {
            id: 'user-1',
            email: 'admin@zippy.com.ar',
            roles: [{ role: { name: 'admin' } }],
          },
        }),
        create: jest.fn().mockResolvedValue({ id: 'new-token-id' }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;

    const service = new AuthService(prisma, jwtService, configService);
    const result = await service.refresh({ refresh_token: 'refresh-token-raw-value-123456' });

    expect(result.access_token).toBe('access.jwt.token');
    expect(result.refresh_token).toBeDefined();
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'old-token-id' },
      data: expect.objectContaining({
        revoked_at: expect.any(Date),
        replaced_by_token_id: 'new-token-id',
      }),
    });
  });

  it('login returns access and refresh tokens for active verified user', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'admin@zippy.com.ar',
          password_hash: 'hashed',
          status: 'ACTIVE',
          email_verified_at: new Date(),
          roles: [{ role: { name: 'admin' } }],
        }),
      },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt-id' }),
      },
    } as any;

    const service = new AuthService(prisma, jwtService, configService);
    const result = await service.login({
      email: 'admin@zippy.com.ar',
      password: 'ChangeMe_12345!',
    });

    expect(result.access_token).toBe('access.jwt.token');
    expect(result.refresh_token).toBeDefined();
  });
});
