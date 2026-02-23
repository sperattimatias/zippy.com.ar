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
import { APP_GUARD, Reflector } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { defaultPinoConfig } from '../../../shared/utils/logger';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { JwtClaimsMiddleware } from './auth/jwt-claims.middleware';
import {
  RequireAdminOrSosMiddleware,
  RequireDriverMiddleware,
  RequirePassengerMiddleware,
  RequirePassengerOrDriverMiddleware,
} from './auth/require-roles.middleware';

const authRoutes: RouteInfo[] = [{ path: 'api/auth/(.*)', method: RequestMethod.ALL }];
const rideRoutes: RouteInfo[] = [{ path: 'api/rides/(.*)', method: RequestMethod.ALL }];
const tripsRoutes: RouteInfo[] = [{ path: 'api/trips/(.*)', method: RequestMethod.ALL }];
const driverPresenceRoutes: RouteInfo[] = [{ path: 'api/drivers/presence/(.*)', method: RequestMethod.ALL }];
const driverRoutes: RouteInfo[] = [{ path: 'api/drivers/(.*)', method: RequestMethod.ALL }];
const adminDriverRoutes: RouteInfo[] = [{ path: 'api/admin/drivers/(.*)', method: RequestMethod.ALL }];
const adminTripsRoutes: RouteInfo[] = [{ path: 'api/admin/trips/(.*)', method: RequestMethod.ALL }];
const paymentRoutes: RouteInfo[] = [{ path: 'api/payments/(.*)', method: RequestMethod.ALL }];

const passengerTripRoutes: RouteInfo[] = [
  { path: 'api/trips/request', method: RequestMethod.POST },
  { path: 'api/trips/:id/accept-bid', method: RequestMethod.POST },
  { path: 'api/trips/:id/rate', method: RequestMethod.POST },
  { path: 'api/trips/:id/cancel', method: RequestMethod.POST },
];
const driverTripRoutes: RouteInfo[] = [
  { path: 'api/trips/:id/bids', method: RequestMethod.POST },
  { path: 'api/trips/:id/driver/en-route', method: RequestMethod.POST },
  { path: 'api/trips/:id/driver/arrived', method: RequestMethod.POST },
  { path: 'api/trips/:id/driver/verify-otp', method: RequestMethod.POST },
  { path: 'api/trips/:id/location', method: RequestMethod.POST },
  { path: 'api/trips/:id/complete', method: RequestMethod.POST },
  { path: 'api/trips/:id/driver/cancel', method: RequestMethod.POST },
];


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
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
      }),
    }),
    JwtModule.register({}),
    LoggerModule.forRoot(defaultPinoConfig),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [AppController],
  providers: [
    AuthGuard,
    RolesGuard,
    Reflector,
    JwtClaimsMiddleware,
    RequirePassengerMiddleware,
    RequireDriverMiddleware,
    RequireAdminOrSosMiddleware,
    RequirePassengerOrDriverMiddleware,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtClaimsMiddleware, RequirePassengerOrDriverMiddleware).forRoutes(...driverRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireAdminOrSosMiddleware).forRoutes(...adminDriverRoutes, ...adminTripsRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...driverPresenceRoutes);
    consumer.apply(JwtClaimsMiddleware, RequirePassengerMiddleware).forRoutes(...passengerTripRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...driverTripRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.AUTH_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/auth': '/auth' },
        }),
      )
      .forRoutes(...authRoutes);

    consumer
      .apply(
        createProxyMiddleware({ target: process.env.DRIVER_SERVICE_URL, changeOrigin: true }),
      )
      .forRoutes(...driverRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.DRIVER_SERVICE_URL,
          changeOrigin: true,
          pathRewrite: { '^/api/admin/drivers': '/admin/drivers' },
        }),
      )
      .forRoutes(...adminDriverRoutes);

    const tripProxy = createProxyMiddleware({ target: process.env.RIDE_SERVICE_URL, changeOrigin: true });
    consumer.apply(tripProxy).forRoutes(...tripsRoutes, ...driverPresenceRoutes);

    consumer
      .apply(
        createProxyMiddleware({ target: process.env.RIDE_SERVICE_URL, changeOrigin: true, pathRewrite: { '^/api/admin/trips': '/admin/trips' } }),
      )
      .forRoutes(...adminTripsRoutes);

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
        createProxyMiddleware({ target: process.env.PAYMENT_SERVICE_URL, changeOrigin: true, pathRewrite: { '^/api/payments': '/' } }),
      )
      .forRoutes(...paymentRoutes);
  }
}
