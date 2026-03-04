import { Test } from '@nestjs/testing';
import { RedisModule } from './redis.module';
import { REDIS_CLIENT } from './redis.types';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

describe('RedisModule', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
    delete process.env.REDIS_DB;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    Redis.mockClear();
  });

  it('provides null redis client when no redis env is configured', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [RedisModule] }).compile();
    expect(moduleRef.get(REDIS_CLIENT)).toBeNull();
    await moduleRef.close();
  });

  it('creates singleton redis client from host/port settings', async () => {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';

    const moduleRef = await Test.createTestingModule({ imports: [RedisModule] }).compile();
    const client = moduleRef.get(REDIS_CLIENT);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');

    expect(client).toBeTruthy();
    expect(Redis.mock.calls[0][0]).toMatchObject({
      host: 'localhost',
      port: 6379,
      lazyConnect: false,
    });

    await moduleRef.close();
  });
});
