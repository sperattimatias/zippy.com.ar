import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  RouteInfo,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppController } from './app.controller';
import { defaultPinoConfig } from '../../../shared/utils/logger';

const authRoutes: RouteInfo[] = [{ path: 'api/auth/(.*)', method: RequestMethod.ALL }];
const rideRoutes: RouteInfo[] = [{ path: 'api/rides/(.*)', method: RequestMethod.ALL }];
const driverRoutes: RouteInfo[] = [{ path: 'api/drivers/(.*)', method: RequestMethod.ALL }];
const paymentRoutes: RouteInfo[] = [{ path: 'api/payments/(.*)', method: RequestMethod.ALL }];

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
      .forRoutes(...authRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/rides': '/' },
        }),
      )
      .forRoutes(...rideRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.DRIVER_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/drivers': '/' },
        }),
      )
      .forRoutes(...driverRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.PAYMENT_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/payments': '/' },
        }),
      )
      .forRoutes(...paymentRoutes);
  }
}
