import { randomUUID } from 'crypto';

type PinoReqId = string | number | object;

export const defaultPinoConfig = {
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    genReqId: (req: {
      headers?: Record<string, string | string[] | undefined>;
      id?: PinoReqId;
    }) => {
      const incoming = req.headers?.['x-request-id'];
      const incomingId = Array.isArray(incoming) ? incoming[0] : incoming;
      return incomingId || req.id || randomUUID();
    },
    customProps: (req: {
      id?: PinoReqId;
      requestId?: string;
      method?: string;
      url?: string;
      originalUrl?: string;
      route?: { path?: string };
    }) => ({
      serviceName: process.env.SERVICE_NAME ?? 'unknown-service',
      requestId: req.requestId ?? req.id,
      method: req.method,
      path: req.originalUrl ?? req.url,
      route: req.route?.path,
    }),
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: { singleLine: true, colorize: true },
          }
        : undefined,
    redact: ['req.headers.authorization'],
  },
};
