import { Inject, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { REDIS_CLIENT, RedisClient } from './redis.types';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (): Promise<RedisClient | null> => {
        const logger = new Logger('RedisModule');
        const redisUrl = process.env.REDIS_URL;
        let host = process.env.REDIS_HOST;
        let port = Number(process.env.REDIS_PORT ?? 6379);
        let password = process.env.REDIS_PASSWORD;
        let db = process.env.REDIS_DB !== undefined ? Number(process.env.REDIS_DB) : undefined;

        if (!host && redisUrl) {
          try {
            const parsed = new URL(redisUrl);
            host = parsed.hostname;
            port = parsed.port ? Number(parsed.port) : 6379;
            password = parsed.password || password;
            db = parsed.pathname ? Number(parsed.pathname.replace('/', '')) || db : db;
          } catch {
            logger.warn('Invalid REDIS_URL value; Redis-backed features will use fallback behavior');
          }
        }

        if (!host) {
          logger.warn('REDIS_HOST/REDIS_URL is not set; Redis-backed features will use fallback behavior');
          return null;
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const Redis = require('ioredis');
          const client = new Redis({
            host,
            port,
            password,
            db,
            lazyConnect: false,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          });

          client.on('error', (error: Error) => {
            logger.warn(`Redis client error: ${error.message}`);
          });

          await client.ping();
          return client;
        } catch (error) {
          logger.warn(`Redis connection unavailable, fallback mode active: ${(error as Error).message}`);
          return null;
        }
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: RedisClient | null) {}

  async onModuleDestroy() {
    if (!this.redisClient) return;
    try {
      await this.redisClient.quit();
    } catch {
      // noop
    }
  }
}
