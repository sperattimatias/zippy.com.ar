import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppController } from './app.controller';
import { defaultPinoConfig } from '../../../shared/utils/logger';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        API_GATEWAY_PORT: Joi.number().default(3000),
        AUTH_SERVICE_URL: Joi.string().uri().required(),
        RIDE_SERVICE_URL: Joi.string().uri().required(),
        DRIVER_SERVICE_URL: Joi.string().uri().required(),
        PAYMENT_SERVICE_URL: Joi.string().uri().required(),
      }),
    }),
    LoggerModule.forRoot(defaultPinoConfig),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.AUTH_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/auth': '/' },
        }),
      )
      .forRoutes('/api/auth/(.*)');

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/rides': '/' },
        }),
      )
      .forRoutes('/api/rides/(.*)');

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.DRIVER_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/drivers': '/' },
        }),
      )
      .forRoutes('/api/drivers/(.*)');

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.PAYMENT_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/payments': '/' },
        }),
      )
      .forRoutes('/api/payments/(.*)');
  }
}
