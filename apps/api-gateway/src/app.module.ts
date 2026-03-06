import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import type { RouteInfo } from '@nestjs/common/interfaces';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Request, Response } from 'express';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { attachClientFingerprintHeaders, fixRequestBody } from './proxy/proxy.utils';
import { AppController } from './app.controller';
import { defaultPinoConfig } from '@shared/utils/logger';
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
import { getRequestId } from '@shared/utils/request-id';

const authRoutes: RouteInfo[] = [
  { path: 'api/auth', method: RequestMethod.ALL },
  { path: 'api/auth/*', method: RequestMethod.ALL },
];
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
  { path: 'api/admin/drivers/pending', method: RequestMethod.ALL },
  { path: 'api/admin/drivers/approve', method: RequestMethod.ALL },
  { path: 'api/admin/drivers/reject', method: RequestMethod.ALL },
  { path: 'api/admin/drivers/suspend', method: RequestMethod.ALL },
  { path: 'api/admin/drivers/review-start', method: RequestMethod.ALL },
  { path: 'api/admin/drivers/:id', method: RequestMethod.ALL },
  { path: 'api/admin/drivers/:id/status', method: RequestMethod.ALL },
  { path: 'api/admin/drivers/:id/notes', method: RequestMethod.ALL },
  { path: 'api/admin/drivers/:id/kyc/reset', method: RequestMethod.ALL },
];
const adminKycDriverRoutes: RouteInfo[] = [
  { path: 'api/admin/kyc/drivers', method: RequestMethod.ALL },
  { path: 'api/admin/kyc/drivers/*', method: RequestMethod.ALL },
];
const adminTripsRoutes: RouteInfo[] = [
  { path: 'api/admin/trips', method: RequestMethod.ALL },
  { path: 'api/admin/trips/*', method: RequestMethod.ALL },
];
const adminDriversLiveRoutes: RouteInfo[] = [
  { path: 'api/admin/drivers/live', method: RequestMethod.ALL },
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
const adminRestrictionsRoutes: RouteInfo[] = [
  { path: 'api/admin/restrictions/:id/lift', method: RequestMethod.ALL },
];
const adminUsersRoutes: RouteInfo[] = [
  { path: 'api/admin/users', method: RequestMethod.ALL },
  { path: 'api/admin/users/:id', method: RequestMethod.ALL },
  { path: 'api/admin/users/:id/status', method: RequestMethod.ALL },
  { path: 'api/admin/users/:id/payment-limit', method: RequestMethod.ALL },
  { path: 'api/admin/users/:id/notes', method: RequestMethod.ALL },
];
const adminConfigRoutes: RouteInfo[] = [
  { path: 'api/admin/config/:key', method: RequestMethod.ALL },
];
const adminPremiumZoneRoutes: RouteInfo[] = [
  { path: 'api/admin/premium-zones', method: RequestMethod.ALL },
  { path: 'api/admin/premium-zones/*', method: RequestMethod.ALL },
];
const adminFraudRoutes: RouteInfo[] = [
  { path: 'api/admin/fraud', method: RequestMethod.ALL },
  { path: 'api/admin/fraud/*', method: RequestMethod.ALL },
];
const publicBadgeRoutes: RouteInfo[] = [
  { path: 'api/public/badges/me', method: RequestMethod.GET },
];
const adminLevelsRoutes: RouteInfo[] = [{ path: 'api/admin/levels', method: RequestMethod.ALL }];
const adminMonthlyPerformanceRoutes: RouteInfo[] = [
  { path: 'api/admin/monthly-performance', method: RequestMethod.ALL },
];
const adminBonusesRoutes: RouteInfo[] = [
  { path: 'api/admin/bonuses', method: RequestMethod.ALL },
  { path: 'api/admin/bonuses/*', method: RequestMethod.ALL },
];
const adminPoliciesRoutes: RouteInfo[] = [
  { path: 'api/admin/policies/:key', method: RequestMethod.ALL },
];
const adminSettingsRoutes: RouteInfo[] = [
  { path: 'api/admin/settings', method: RequestMethod.ALL },
  { path: 'api/admin/settings/*', method: RequestMethod.ALL },
];
const adminPricingRoutes: RouteInfo[] = [
  { path: 'api/admin/pricing', method: RequestMethod.ALL },
  { path: 'api/admin/pricing/*', method: RequestMethod.ALL },
];
const adminIncentivesRoutes: RouteInfo[] = [
  { path: 'api/admin/incentives', method: RequestMethod.ALL },
  { path: 'api/admin/incentives/*', method: RequestMethod.ALL },
];
const adminAuditRoutes: RouteInfo[] = [
  { path: 'api/admin/audit', method: RequestMethod.ALL },
  { path: 'api/admin/audit/*', method: RequestMethod.ALL },
];
const adminReportsRoutes: RouteInfo[] = [
  { path: 'api/admin/reports', method: RequestMethod.ALL },
  { path: 'api/admin/reports/*', method: RequestMethod.ALL },
];
const adminPaymentsRoutes: RouteInfo[] = [
  { path: 'api/admin/payments', method: RequestMethod.ALL },
  { path: 'api/admin/payments/*', method: RequestMethod.ALL },
];
const adminSupportRoutes: RouteInfo[] = [
  { path: 'api/admin/support/tickets', method: RequestMethod.ALL },
  { path: 'api/admin/support/tickets/*', method: RequestMethod.ALL },
];
const adminNotificationsRoutes: RouteInfo[] = [
  { path: 'api/admin/notifications', method: RequestMethod.ALL },
  { path: 'api/admin/notifications/*', method: RequestMethod.ALL },
];
const driverCommissionRoutes: RouteInfo[] = [
  { path: 'api/drivers/commission/current', method: RequestMethod.ALL },
];
const paymentRoutes: RouteInfo[] = [
  { path: 'api/payments', method: RequestMethod.ALL },
  { path: 'api/payments/*', method: RequestMethod.ALL },
];
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

const proxyErrorHandler = (target: string) => (err: Error, req: Request, res: Response) => {
  const requestId = getRequestId(req as any);
  console.error(JSON.stringify({ level: 'error', message: 'upstream timeout', target, requestId }));
  if (res.headersSent) return;
  res.status(504).json({
    statusCode: 504,
    message: 'Upstream timeout',
    requestId,
  });
};

const createServiceProxy = (
  options: Parameters<typeof createProxyMiddleware>[0],
  timeoutMs: number,
  connectTimeoutMs: number,
) =>
  createProxyMiddleware({
    ...options,
    proxyTimeout: timeoutMs,
    timeout: connectTimeoutMs,
    on: {
      proxyReq: fixRequestBody,
      ...(options as any).on,
      error: proxyErrorHandler(String((options as any).target ?? 'unknown')),
    },
  });

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        API_GATEWAY_PORT: Joi.number().default(3000),
        PORT: Joi.number().default(3000),
        SERVICE_NAME: Joi.string().default('api-gateway'),
        METRICS_ENABLED: Joi.string().valid('0', '1').default('0'),

        AUTH_SERVICE_URL: Joi.string().uri().required(),
        RIDE_SERVICE_URL: Joi.string().uri().required(),
        DRIVER_SERVICE_URL: Joi.string().uri().required(),
        PAYMENT_SERVICE_URL: Joi.string().uri().required(),
        SUPPORT_SERVICE_URL: Joi.string().uri().required(),
        NOTIFICATIONS_SERVICE_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),

        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        THROTTLE_TTL_SECONDS: Joi.number().default(60),
        THROTTLE_LIMIT_GENERAL: Joi.number().default(100),
        THROTTLE_LIMIT_AUTH: Joi.number().default(10),
        THROTTLE_TTL_MS: Joi.number().default(60000),
        THROTTLE_LIMIT: Joi.number().default(100),
        THROTTLE_AUTH_TTL_MS: Joi.number().default(60000),
        THROTTLE_AUTH_LIMIT: Joi.number().default(10),
        CORS_ORIGINS: Joi.string().optional(),
        CORS_CREDENTIALS: Joi.string().valid('true', 'false').default('true'),
        TRUST_PROXY: Joi.string().default('1'),
        PROXY_TIMEOUT_MS: Joi.number().default(15000),
        PROXY_CONNECT_TIMEOUT_MS: Joi.number().default(5000),
      }),
    }),
    JwtModule.register({}),
    LoggerModule.forRoot(defaultPinoConfig),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL_SECONDS', 60),
            limit: configService.get<number>('THROTTLE_LIMIT_GENERAL', 100),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          configService.get<string>('REDIS_URL') ?? 'redis://redis:6379',
        ),
      }),
    }),
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
    const timeoutMs = Number(process.env.PROXY_TIMEOUT_MS ?? 15000);
    const connectTimeoutMs = Number(process.env.PROXY_CONNECT_TIMEOUT_MS ?? 5000);

    consumer
      .apply(JwtClaimsMiddleware, RequirePassengerOrDriverMiddleware)
      .forRoutes(...publicBadgeRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...driverRoutes);

    consumer
      .apply(JwtClaimsMiddleware, RequireAdminOrSosMiddleware)
      .forRoutes(
        ...adminDriverRoutes,
        ...adminKycDriverRoutes,
        ...adminTripsRoutes,
        ...adminDriversLiveRoutes,
        ...adminGeoZonesRoutes,
        ...adminSafetyAlertsRoutes,
        ...adminScoresRoutes,
        ...adminUserScoreRoutes,
        ...adminRestrictionsRoutes,
        ...adminUsersRoutes,
        ...adminConfigRoutes,
        ...adminPremiumZoneRoutes,
        ...adminFraudRoutes,
        ...adminLevelsRoutes,
        ...adminMonthlyPerformanceRoutes,
        ...adminBonusesRoutes,
        ...adminPoliciesRoutes,
        ...adminSettingsRoutes,
        ...adminPricingRoutes,
        ...adminIncentivesRoutes,
        ...adminAuditRoutes,
        ...adminPaymentsRoutes,
        ...adminSupportRoutes,
        ...adminNotificationsRoutes,
        ...adminReportsRoutes,
      );

    consumer
      .apply(JwtClaimsMiddleware, RequireDriverMiddleware)
      .forRoutes(...driverPresenceRoutes, ...driverCommissionRoutes);
    consumer
      .apply(JwtClaimsMiddleware, RequirePassengerMiddleware)
      .forRoutes(...passengerTripRoutes);
    consumer.apply(JwtClaimsMiddleware, RequireDriverMiddleware).forRoutes(...driverTripRoutes);
    consumer
      .apply(JwtClaimsMiddleware, RequirePassengerMiddleware)
      .forRoutes(...paymentCreatePreferenceRoutes);
    consumer
      .apply(JwtClaimsMiddleware, RequireDriverMiddleware)
      .forRoutes(...paymentDriverFinanceRoutes);
    consumer
      .apply(JwtClaimsMiddleware, RequireAdminOrSosMiddleware)
      .forRoutes(...paymentAdminFinanceRoutes, ...paymentAdminPaymentRoutes);

    consumer.apply(attachClientFingerprintHeaders).forRoutes(...tripsRoutes, ...paymentRoutes);
    consumer.apply(AuthRateLimitMiddleware).forRoutes(...authRoutes);

    consumer
      .apply(
        createServiceProxy(
          {
            target: process.env.AUTH_SERVICE_URL,
            changeOrigin: true,
            xfwd: true,
            pathRewrite: { '^/api/auth': '/auth' },
          },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...authRoutes);

    consumer
      .apply(
        createServiceProxy(
          {
            target: process.env.AUTH_SERVICE_URL,
            changeOrigin: true,
            xfwd: true,
            pathRewrite: { '^/api/admin/users': '/auth/admin/users' },
          },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...adminUsersRoutes);

    consumer
      .apply(
        createServiceProxy(
          { target: process.env.DRIVER_SERVICE_URL, changeOrigin: true, xfwd: true },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...driverRoutes);

    consumer
      .apply(
        createServiceProxy(
          {
            target: process.env.SUPPORT_SERVICE_URL,
            changeOrigin: true,
            xfwd: true,
            pathRewrite: { '^/api/admin/support/tickets': '/admin/support/tickets' },
          },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...adminSupportRoutes);

    consumer
      .apply(
        createServiceProxy(
          {
            target: process.env.NOTIFICATIONS_SERVICE_URL,
            changeOrigin: true,
            xfwd: true,
            pathRewrite: { '^/api/admin/notifications': '/admin/notifications' },
          },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...adminNotificationsRoutes);

    consumer
      .apply(
        createServiceProxy(
          {
            target: process.env.DRIVER_SERVICE_URL,
            changeOrigin: true,
            xfwd: true,
            pathRewrite: { '^/api/admin/drivers': '/admin/drivers' },
          },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...adminDriverRoutes);

    consumer
      .apply(
        createServiceProxy(
          {
            target: process.env.DRIVER_SERVICE_URL,
            changeOrigin: true,
            xfwd: true,
            pathRewrite: { '^/api/admin/kyc/drivers': '/admin/kyc/drivers' },
          },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...adminKycDriverRoutes);

    consumer
      .apply(
        createServiceProxy(
          {
            target: process.env.RIDE_SERVICE_URL,
            changeOrigin: true,
            xfwd: true,
            pathRewrite: {
              '^/ride/health': '/health',
              '^/ride/ready': '/ready',
              '^/api/ride/health': '/health',
              '^/api/ride/ready': '/ready',
            },
          },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...rideHealthRoutes);

    const tripProxy = createServiceProxy(
      { target: process.env.RIDE_SERVICE_URL, changeOrigin: true, xfwd: true },
      timeoutMs,
      connectTimeoutMs,
    );
    consumer.apply(tripProxy).forRoutes(...tripsRoutes, ...driverPresenceRoutes);

    const rideAdminPrefixes: Array<[RouteInfo[], string, string]> = [
      [adminTripsRoutes, '^/api/admin/trips', '/admin/trips'],
      [adminDriversLiveRoutes, '^/api/admin/drivers/live', '/admin/drivers/live'],
      [adminGeoZonesRoutes, '^/api/admin/geozones', '/admin/geozones'],
      [adminSafetyAlertsRoutes, '^/api/admin/safety-alerts', '/admin/safety-alerts'],
      [adminScoresRoutes, '^/api/admin/scores', '/admin/scores'],
      [adminUserScoreRoutes, '^/api/admin/users', '/admin/users'],
      [adminRestrictionsRoutes, '^/api/admin/restrictions', '/admin/restrictions'],
      [adminConfigRoutes, '^/api/admin/config', '/admin/config'],
      [adminPremiumZoneRoutes, '^/api/admin/premium-zones', '/admin/premium-zones'],
      [adminFraudRoutes, '^/api/admin/fraud', '/admin/fraud'],
      [publicBadgeRoutes, '^/api/public/badges', '/public/badges'],
      [adminLevelsRoutes, '^/api/admin/levels', '/admin/levels'],
      [
        adminMonthlyPerformanceRoutes,
        '^/api/admin/monthly-performance',
        '/admin/monthly-performance',
      ],
      [adminBonusesRoutes, '^/api/admin/bonuses', '/admin/bonuses'],
      [adminPoliciesRoutes, '^/api/admin/policies', '/admin/policies'],
      [adminSettingsRoutes, '^/api/admin/settings', '/admin/settings'],
      [adminPricingRoutes, '^/api/admin/pricing', '/admin/pricing'],
      [adminIncentivesRoutes, '^/api/admin/incentives', '/admin/incentives'],
      [adminAuditRoutes, '^/api/admin/audit', '/admin/audit'],
      [adminReportsRoutes, '^/api/admin/reports', '/admin/reports'],
      [adminPaymentsRoutes, '^/api/admin/payments', '/admin/payments'],
      [driverCommissionRoutes, '^/api/drivers/commission/current', '/drivers/commission/current'],
    ];

    for (const [routes, from, to] of rideAdminPrefixes) {
      consumer
        .apply(
          createServiceProxy(
            {
              target: process.env.RIDE_SERVICE_URL,
              changeOrigin: true,
              xfwd: true,
              pathRewrite: { [from]: to },
            },
            timeoutMs,
            connectTimeoutMs,
          ),
        )
        .forRoutes(...routes);
    }

    consumer
      .apply(
        createServiceProxy(
          {
            target: process.env.RIDE_SERVICE_URL,
            changeOrigin: true,
            xfwd: true,
            pathRewrite: { '^/api/rides': '' },
          },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...rideRoutes);

    consumer
      .apply(
        createServiceProxy(
          {
            target: process.env.PAYMENT_SERVICE_URL,
            changeOrigin: true,
            xfwd: true,
            pathRewrite: { '^/api/payments': '' },
          },
          timeoutMs,
          connectTimeoutMs,
        ),
      )
      .forRoutes(...paymentRoutes);
  }
}
