import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { requestIdMiddleware } from '../../shared/utils/request-id';



function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}



function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(PinoLogger);
  app.useLogger(logger);
  app.use(requestIdMiddleware);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Zippy API Gateway')
    .setDescription('Gateway API docs and entrypoint for backend services')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const config = app.get(ConfigService);

  const trustProxy = config.get<string>('TRUST_PROXY', '1');
  if (trustProxy !== '0' && trustProxy.toLowerCase() !== 'false') {
    app.set('trust proxy', 1);
  }

  const isProd = config.get<string>('NODE_ENV', 'development') === 'production';
  app.use(helmet({
    contentSecurityPolicy: isProd ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  const corsOrigins = parseCsv(config.get<string>('CORS_ORIGINS'), [
    'http://localhost:3000',
    'http://localhost:3005',
  ]);

  app.enableCors({
    origin: corsOrigins,
    credentials: config.get<string>('CORS_CREDENTIALS', 'true') !== 'false',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['Authorization', 'X-Request-Id'],
  });

  const port = config.get<number>('API_GATEWAY_PORT', 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API Gateway running on ${port}`, 'Bootstrap');
}

bootstrap();
