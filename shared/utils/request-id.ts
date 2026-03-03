import { randomUUID } from 'crypto';

type Headers = Record<string, string | string[] | undefined>;

type RequestWithId = {
  headers: Headers;
  requestId?: string;
  id?: string;
};

type ResponseLike = {
  setHeader(name: string, value: string): void;
};

type NextFunction = () => void;

export function requestIdMiddleware(req: RequestWithId, res: ResponseLike, next: NextFunction) {
  const incoming = req.headers['x-request-id'];
  const requestId =
    (Array.isArray(incoming) ? incoming[0] : incoming) || req.requestId || req.id || randomUUID();

  req.requestId = requestId;
  req.id = requestId;
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

export function getRequestId(req: RequestWithId): string {
  return req.requestId || req.id || 'unknown';
}
