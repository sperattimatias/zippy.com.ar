import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { defaultPinoConfig } from '../../../shared/utils/logger';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        AUTH_SERVICE_PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),
      }),
    }),
    LoggerModule.forRoot(defaultPinoConfig),
  ],
  controllers: [AppController],
})
export class AppModule {}
