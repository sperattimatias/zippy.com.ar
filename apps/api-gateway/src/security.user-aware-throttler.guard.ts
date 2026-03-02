import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserAwareThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { sub?: string } | undefined;
    if (user?.sub) {
      return `user:${user.sub}`;
    }

    const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
    const xff = headers['x-forwarded-for'];
    const ipFromHeader = Array.isArray(xff) ? xff[0] : typeof xff === 'string' ? xff.split(',')[0].trim() : undefined;
    const reqIp = typeof req.ip === 'string' ? req.ip : undefined;
    return `ip:${ipFromHeader ?? reqIp ?? 'unknown'}`;
  }

  protected getRequestResponse(context: ExecutionContext) {
    const http = context.switchToHttp();
    return {
      req: http.getRequest(),
      res: http.getResponse(),
    };
  }
}
