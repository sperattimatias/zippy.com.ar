import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(PinoLogger);
  app.useLogger(logger);

  const config = app.get(ConfigService);
  const port = config.get<number>('AUTH_SERVICE_PORT', 3001);

  await app.listen(port, '0.0.0.0');
  Logger.log('auth listening on port ' + port, 'Bootstrap');
}

bootstrap();
