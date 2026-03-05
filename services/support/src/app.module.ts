import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { JwtModule } from '@nestjs/jwt';
import { defaultPinoConfig } from '@shared/utils/logger';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';
import { JwtAccessGuard } from './common/jwt-access.guard';
import { RolesGuard } from './common/roles.guard';
import { SupportController } from './support/support.controller';
import { SupportService } from './support/support.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        SUPPORT_SERVICE_PORT: Joi.number().default(3006),
        PORT: Joi.number().default(3006),
        SERVICE_NAME: Joi.string().default('support'),
        METRICS_ENABLED: Joi.string().valid('0', '1').default('0'),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().uri().required(),
        JWT_ACCESS_SECRET: Joi.string().min(32).required(),
      }),
    }),
    JwtModule.register({}),
    LoggerModule.forRoot(defaultPinoConfig),
  ],
  controllers: [AppController, SupportController],
  providers: [PrismaService, JwtAccessGuard, RolesGuard, SupportService],
})
export class AppModule {}
