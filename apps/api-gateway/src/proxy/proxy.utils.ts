import type { NextFunction, Request, Response } from 'express';
import type { ClientRequest, IncomingMessage } from 'http';

export const attachClientFingerprintHeaders = (req: Request, _res: Response, next: NextFunction) => {
  const xff = req.headers['x-forwarded-for'];
  const ip = Array.isArray(xff) ? xff[0] : typeof xff === 'string' ? xff.split(',')[0].trim() : req.ip;

  req.headers['x-client-ip'] = req.headers['x-client-ip'] ?? ip ?? '';
  req.headers['x-client-ua'] = req.headers['x-client-ua'] ?? req.headers['user-agent'] ?? '';
  next();
};

type ParsedRequest = IncomingMessage & { body?: unknown };

export const fixRequestBody = (proxyReq: ClientRequest, req: ParsedRequest) => {
  if (!req.body || typeof req.body !== 'object') return;

  const body = req.body as Record<string, unknown>;
  const contentType = proxyReq.getHeader('Content-Type');
  const isJson =
    typeof contentType === 'string'
      ? contentType.includes('application/json')
      : Array.isArray(contentType)
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
    bodyData = Object.entries(body)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
  } else {
    return;
  }

  proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
  proxyReq.write(bodyData);
};
