import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class RequirePassengerOrDriverMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.some((r) => ['passenger', 'driver', 'admin', 'sos'].includes(r))) {
      throw new ForbiddenException('passenger/driver role required');
    }
    next();
  }
}

@Injectable()
export class RequireAdminOrSosMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('sos')) {
      throw new ForbiddenException('admin/sos role required');
    }
    next();
  }
}
