import type { NestMiddleware} from '@nestjs/common';
import { Injectable, TooManyRequestsException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';

type Bucket = { count: number; resetAt: number };
type JwtClaims = { sub?: string };

@Injectable()
export class AuthRateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const ttlSeconds =
      this.configService.get<number>('THROTTLE_TTL_SECONDS') ??
      Math.floor(this.configService.get<number>('THROTTLE_TTL_MS', 60000) / 1000);
    const ttlMs = ttlSeconds * 1000;
    const limit =
      this.configService.get<number>('THROTTLE_LIMIT_AUTH') ??
      this.configService.get<number>('THROTTLE_AUTH_LIMIT', 10);

    const key = await this.getTracker(req);
    const now = Date.now();

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + ttlMs });
      next();
      return;
    }

    if (bucket.count >= limit) {
      throw new TooManyRequestsException('Too many auth requests');
    }

    bucket.count += 1;
    next();
  }

  private async getTracker(req: Request): Promise<string> {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7);
      try {
        const claims = (await this.jwtService.verifyAsync(token, {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        })) as JwtClaims;
        if (claims.sub) return `auth-user:${claims.sub}`;
      } catch {
        // fallback to IP
      }
    }

    const xff = req.headers['x-forwarded-for'];
    const ip = Array.isArray(xff)
      ? xff[0]
      : typeof xff === 'string'
        ? xff.split(',')[0].trim()
        : req.ip;
    return `auth-ip:${ip ?? 'unknown'}`;
  }
}
