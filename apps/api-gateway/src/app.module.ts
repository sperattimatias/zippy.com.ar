import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import type { RouteInfo } from '@nestjs/common/interfaces';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { NextFunction, Request, Response } from 'express';
import type { ClientRequest } from 'http';
import type { IncomingMessage } from 'http';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { defaultPinoConfig } from '../shared/utils/logger';
import { AuthGuard } from './auth/auth.guard';
import { UserAwareThrottlerGuard } from './security.user-aware-throttler.guard';
import { AuthRateLimitMiddleware } from './auth/auth-rate-limit.middleware';
import { RolesGuard } from './auth/roles.guard';
import { JwtClaimsMiddleware } from './auth/jwt-claims.middleware';
import {
  RequireAdminOrSosMiddleware,
  RequireDriverMiddleware,
  RequirePassengerMiddleware,
  RequirePassengerOrDriverMiddleware,
} from './auth/require-roles.middleware';

/**
 * IMPORTANT:
 * Nest's forRoutes() matching does NOT reliably support regex-style patterns like "(.*)".
 * Using "api/foo/(.*)" can cause middleware NOT to apply, leading to 404 "Cannot POST ..."
 * Fix: use explicit base + wildcard paths: "api/foo" and "api/foo/*"
 */

/** ---------- ROUTES (Gateway ingress) ---------- */

const authRoutes: RouteInfo[] = [
  { path: 'api/auth', method: RequestMethod.ALL },
  { path: 'api/auth/*', method: RequestMethod.ALL },
];

/**
 * Ride service health convenience routes
 */
const rideHealthRoutes: RouteInfo[] = [
  { path: 'ride/health', method: RequestMethod.GET },
  { path: 'ride/ready', method: RequestMethod.GET },
  { path: 'api/ride/health', method: RequestMethod.GET },
  { path: 'api/ride/ready', method: RequestMethod.GET },
];

const rideRoutes: RouteInfo[] = [
  { path: 'api/rides', method: RequestMethod.ALL },
  { path: 'api/rides/*', method: RequestMethod.ALL },
];

const tripsRoutes: RouteInfo[] = [
  { path: 'api/trips', method: RequestMethod.ALL },
  { path: 'api/trips/*', method: RequestMethod.ALL },
];

const driverPresenceRoutes: RouteInfo[] = [
  { path: 'api/drivers/presence', method: RequestMethod.ALL },
  { path: 'api/drivers/presence/*', method: RequestMethod.ALL },
];

const driverRoutes: RouteInfo[] = [
  { path: 'api/drivers', method: RequestMethod.ALL },
  { path: 'api/drivers/*', method: RequestMethod.ALL },
];

const adminDriverRoutes: RouteInfo[] = [
  { path: 'api/admin/drivers', method: RequestMethod.ALL },
  { path: 'api/admin/drivers/*', method: RequestMethod.ALL },
];

const adminTripsRoutes: RouteInfo[] = [
  { path: 'api/admin/trips', method: RequestMethod.ALL },
  { path: 'api/admin/trips/*', method: RequestMethod.ALL },
];

const adminGeoZonesRoutes: RouteInfo[] = [
  { path: 'api/admin/geozones', method: RequestMethod.ALL },
  { path: 'api/admin/geozones/*', method: RequestMethod.ALL },
];

const adminSafetyAlertsRoutes: RouteInfo[] = [
  { path: 'api/admin/safety-alerts', method: RequestMethod.ALL },
  { path: 'api/admin/safety-alerts/*', method: RequestMethod.ALL },
];

const adminScoresRoutes: RouteInfo[] = [
  { path: 'api/admin/scores', method: RequestMethod.ALL },
  { path: 'api/admin/scores/*', method: RequestMethod.ALL },
];

const adminUserScoreRoutes: RouteInfo[] = [
  { path: 'api/admin/users/:user_id/score', method: RequestMethod.ALL },
  { path: 'api/admin/users/:user_id/score/adjust', method: RequestMethod.ALL },
  { path: 'api/admin/users/:user_id/restrictions', method: RequestMethod.ALL },
];

const adminRestrictionsRoutes: RouteInfo[] = [{ path: 'api/admin/restrictions/:id/lift', method: RequestMethod.ALL }];

const adminConfigRoutes: RouteInfo[] = [{ path: 'api/admin/config/:key', method: RequestMethod.ALL }];

const adminPremiumZoneRoutes: RouteInfo[] = [
  { path: 'api/admin/premium-zones', method: RequestMethod.ALL },
  { path: 'api/admin/premium-zones/*', method: RequestMethod.ALL },
];

const adminFraudRoutes: RouteInfo[] = [
  { path: 'api/admin/fraud', method: RequestMethod.ALL },
  { path: 'api/admin/fraud/*', method: RequestMethod.ALL },
];

const publicBadgeRoutes: RouteInfo[] = [{ path: 'api/public/badges/me', method: RequestMethod.GET }];

const adminLevelsRoutes: RouteInfo[] = [{ path: 'api/admin/levels', method: RequestMethod.ALL }];

const adminMonthlyPerformanceRoutes: RouteInfo[] = [{ path: 'api/admin/monthly-performance', method: RequestMethod.ALL }];

const adminBonusesRoutes: RouteInfo[] = [
  { path: 'api/admin/bonuses', method: RequestMethod.ALL },
  { path: 'api/admin/bonuses/*', method: RequestMethod.ALL },
];

const adminPoliciesRoutes: RouteInfo[] = [{ path: 'api/admin/policies/:key', method: RequestMethod.ALL }];

const driverCommissionRoutes: RouteInfo[] = [{ path: 'api/drivers/commission/current', method: RequestMethod.ALL }];

const paymentRoutes: RouteInfo[] = [
  { path: 'api/payments', method: RequestMethod.ALL },
  { path: 'api/payments/*', method: RequestMethod.ALL },
];

/**
 * Support both:
 *   - /api/payments/create-preference
 *   - /api/payments/payments/create-preference
 */
const paymentCreatePreferenceRoutes: RouteInfo[] = [
  { path: 'api/payments/create-preference', method: RequestMethod.POST },
  { path: 'api/payments/payments/create-preference', method: RequestMethod.POST },
];

const paymentDriverFinanceRoutes: RouteInfo[] = [
  { path: 'api/payments/drivers/finance', method: RequestMethod.ALL },
  { path: 'api/payments/drivers/finance/*', method: RequestMethod.ALL },
];

const paymentAdminFinanceRoutes: RouteInfo[] = [
  { path: 'api/payments/admin/finance', method: RequestMethod.ALL },
  { path: 'api/payments/admin/finance/*', method: RequestMethod.ALL },
];

const paymentAdminPaymentRoutes: RouteInfo[] = [
  { path: 'api/payments/admin/payments', method: RequestMethod.ALL },
  { path: 'api/payments/admin/payments/*', method: RequestMethod.ALL },
];

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

/** ---------- MIDDLEWARE HELPERS ---------- */

const attachClientFingerprintHeaders = (req: Request, _res: Response, next: NextFunction) => {
  const xff = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xff) ? xff[0] : typeof xff === 'string' ? xff.split(',')[0].trim() : req.ip;

  req.headers['x-client-ip'] = req.headers['x-client-ip'] ?? ip ?? '';
  req.headers['x-client-ua'] = req.headers['x-client-ua'] ?? req.headers['user-agent'] ?? '';
  next();
};

/**
 * Fix request body for proxies when Nest/Express already parsed it.
 * (Needed for POST/PUT/PATCH with JSON or urlencoded, otherwise body can be lost.)
 *
 * This replaces the old "onProxyReq" option which no longer exists in newer
 * http-proxy-middleware typings. Now we use: on: { proxyReq: fixRequestBody }
 */
type ParsedRequest = IncomingMessage & { body?: unknown };

const fixRequestBody = (proxyReq: ClientRequest, req: ParsedRequest) => {
  if (!req.body || typeof req.body !== 'object') return;

  const body = req.body as Record<string, unknown>;

  const contentType = proxyReq.getHeader('Content-Type');
  const isJson =
    typeof contentType === 'string' ? contentType.includes('application/json') : Array.isArray(contentType)
      ? contentType.some((v) => String(v).includes('application/json'))
      : false;

  const isUrlEncoded =
    typeof contentType === 'string'
      ? contentType.includes('application/x-www-form-urlencoded')
      : Array.isArray(contentType)
        ? contentType.some((v) => String(v).includes('application/x-www-form-urlencoded'))
        : false;

  let bodyData: string | null = null;

  if (isJson) {
    bodyData = JSON.stringify(body);
  } else if (isUrlEncoded) {
    // Minimal urlencoded serializer (no deps)
    bodyData = Object.entries(body)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
  } else {
    // If it's multipart/form-data, don't touch it.
    return;
  }

  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
  proxyReq.write(bodyData);
};

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
        THROTTLE_TTL_MS: Joi.number().default(60000),
        THROTTLE_LIMIT: Joi.number().default(100),
        THROTTLE_AUTH_TTL_MS: Joi.number().default(60000),
        THROTTLE_AUTH_LIMIT: Joi.number().default(10),
        CORS_ORIGINS: Joi.string().optional(),
        CORS_CREDENTIALS: Joi.string().valid('true', 'false').default('true'),
        TRUST_PROXY: Joi.string().default('1'),
      }),
    }),
    JwtModule.register({}),
    LoggerModule.forRoot(defaultPinoConfig),
    ThrottlerModule.forRoot([{ ttl: Number(process.env.THROTTLE_TTL_MS ?? 60000), limit: Number(process.env.THROTTLE_LIMIT ?? 100) }]),
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
    AuthRateLimitMiddleware,
    {
      provide: APP_GUARD,
      useClass: UserAwareThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    /** ---------- AUTHZ MIDDLEWARES (run before proxies) ---------- */

    consumer.apply(JwtClaimsMiddleware, RequirePassengerOrDriverMiddleware).forRoutes(...publicBadgeRoutes);

    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...driverRoutes);

    consumer
      .apply(JwtClaimsMiddleware, RequireAdminOrSosMiddleware)
      .forRoutes(
        ...adminDriverRoutes,
        ...adminTripsRoutes,
        ...adminGeoZonesRoutes,
        ...adminSafetyAlertsRoutes,
        ...adminScoresRoutes,
        ...adminUserScoreRoutes,
        ...adminRestrictionsRoutes,
        ...adminConfigRoutes,
        ...adminPremiumZoneRoutes,
        ...adminFraudRoutes,
        ...adminLevelsRoutes,
        ...adminMonthlyPerformanceRoutes,
        ...adminBonusesRoutes,
        ...adminPoliciesRoutes,
      );

    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...driverPresenceRoutes, ...driverCommissionRoutes);

    consumer.apply(JwtClaimsMiddleware, RequirePassengerMiddleware).forRoutes(...passengerTripRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...driverTripRoutes);

    consumer.apply(JwtClaimsMiddleware, RequirePassengerMiddleware).forRoutes(...paymentCreatePreferenceRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...paymentDriverFinanceRoutes);
    consumer
      .apply(JwtClaimsMiddleware, RequireAdminOrSosMiddleware)
      .forRoutes(...paymentAdminFinanceRoutes, ...paymentAdminPaymentRoutes);

    consumer.apply(attachClientFingerprintHeaders).forRoutes(...tripsRoutes, ...paymentRoutes);
    consumer.apply(AuthRateLimitMiddleware).forRoutes(...authRoutes);

    /** ---------- PROXIES ---------- */

    // AUTH proxy
    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.AUTH_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/auth': '/auth' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...authRoutes);

    // DRIVER proxy (pass-through)
    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.DRIVER_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...driverRoutes);

    // ADMIN DRIVERS proxy
    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.DRIVER_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/drivers': '/admin/drivers' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminDriverRoutes);

    // Ride health convenience routes on gateway
    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: {
            '^/ride/health': '/health',
            '^/ride/ready': '/ready',
            '^/api/ride/health': '/health',
            '^/api/ride/ready': '/ready',
          },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...rideHealthRoutes);

    // TRIPS + DRIVER PRESENCE proxy (pass-through)
    const tripProxy = createProxyMiddleware({
      target: process.env.RIDE_SERVICE_URL,
      changeOrigin: true,
      xfwd: true,
      on: { proxyReq: fixRequestBody },
    });
    consumer.apply(tripProxy).forRoutes(...tripsRoutes, ...driverPresenceRoutes);

    // Admin ride proxies
    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/trips': '/admin/trips' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminTripsRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/geozones': '/admin/geozones' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminGeoZonesRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/safety-alerts': '/admin/safety-alerts' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminSafetyAlertsRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/scores': '/admin/scores' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminScoresRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/users': '/admin/users' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminUserScoreRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/restrictions': '/admin/restrictions' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminRestrictionsRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/config': '/admin/config' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminConfigRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/premium-zones': '/admin/premium-zones' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminPremiumZoneRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/fraud': '/admin/fraud' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminFraudRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/public/badges': '/public/badges' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...publicBadgeRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/levels': '/admin/levels' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminLevelsRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/monthly-performance': '/admin/monthly-performance' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminMonthlyPerformanceRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/bonuses': '/admin/bonuses' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminBonusesRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/admin/policies': '/admin/policies' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...adminPoliciesRoutes);

    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/drivers/commission/current': '/drivers/commission/current' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...driverCommissionRoutes);

    // Rides proxy
    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.RIDE_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/rides': '' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...rideRoutes);

    // Payments proxy
    consumer
      .apply(
        createProxyMiddleware({
          target: process.env.PAYMENT_SERVICE_URL,
          changeOrigin: true,
          xfwd: true,
          pathRewrite: { '^/api/payments': '' },
          on: { proxyReq: fixRequestBody },
        }),
      )
      .forRoutes(...paymentRoutes);
  }
}