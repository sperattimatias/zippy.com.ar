import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { RideSocketGateway } from './socket.gateway';
import { defaultPinoConfig } from '../../../shared/utils/logger';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        LOG_LEVEL: Joi.string().default('info'),
        RIDE_SERVICE_PORT: Joi.number().default(3002),
        DATABASE_URL: Joi.string().uri().required(),
        REDIS_URL: Joi.string().uri().required(),
      }),
    }),
    LoggerModule.forRoot(defaultPinoConfig),
  ],
  controllers: [AppController],
  providers: [RideSocketGateway],
})
export class AppModule {}
