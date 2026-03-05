import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { requestIdMiddleware } from '@shared/utils/request-id';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(PinoLogger);
  app.useLogger(logger);
  app.use(requestIdMiddleware);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = app.get(ConfigService);
  const port = config.get<number>('SUPPORT_SERVICE_PORT', 3006);

  await app.listen(port, '0.0.0.0');
  Logger.log('support listening on port ' + port, 'Bootstrap');
}

bootstrap();
