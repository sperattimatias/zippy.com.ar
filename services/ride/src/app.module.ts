import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { defaultPinoConfig } from '@shared/utils/logger';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { JwtAccessGuard } from './common/jwt-access.guard';
import { RolesGuard } from './common/roles.guard';
import { RideController } from './ride/ride.controller';
import { RideService } from './ride/ride.service';
import { RideGateway } from './ride/ride.gateway';
import { ScoreService } from './score/score.service';
import { MeritocracyService } from './meritocracy/meritocracy.service';
import { LevelAndBonusService } from './levels/level-bonus.service';
import { FraudService } from './fraud/fraud.service';
import { GeoZoneCacheService } from './ride/geozone-cache.service';
import { RedisStateService } from './ride/redis-state.service';
import { DriverGeoIndexService } from './ride/driver-geo-index.service';
import { OutboxPublisherService } from './ride/outbox-publisher.service';
import { OutboxConsumerService } from './ride/outbox-consumer.service';
import { RedisModule } from './infra/redis/redis.module';
import { MetricsController } from './metrics/metrics.controller';
import { MetricsService } from './metrics/metrics.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        RIDE_SERVICE_PORT: Joi.number().default(3002),
        PORT: Joi.number().default(3002),
        SERVICE_NAME: Joi.string().default('ride'),
        METRICS_ENABLED: Joi.string().valid('0', '1').default('0'),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().uri().optional(),
        REDIS_HOST: Joi.string().optional(),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().optional(),
        REDIS_DB: Joi.number().integer().min(0).optional(),
        OUTBOX_LEASE_SECONDS: Joi.number().integer().min(1).default(60),
        OUTBOX_BATCH_SIZE: Joi.number().integer().min(1).default(50),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
        WS_CORS_ORIGINS: Joi.string().optional(),
      }),
    }),
    JwtModule.register({}),
    ScheduleModule.forRoot(),
    LoggerModule.forRoot(defaultPinoConfig),
    RedisModule,
  ],
  controllers: [AppController, RideController, MetricsController],
  providers: [
    PrismaService,
    JwtAccessGuard,
    RolesGuard,
    RideService,
    RideGateway,
    GeoZoneCacheService,
    RedisStateService,
    DriverGeoIndexService,
    OutboxPublisherService,
    OutboxConsumerService,
    MeritocracyService,
    ScoreService,
    LevelAndBonusService,
    FraudService,
    MetricsService,
  ],
})
export class AppModule {}
