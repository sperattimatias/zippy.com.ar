import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ROLES } from '@shared/enums/role.enum';

@Injectable()
export class RequirePassengerMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes(ROLES.PASSENGER)) throw new ForbiddenException('passenger role required');
    next();
  }
}

@Injectable()
export class RequireDriverMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes(ROLES.DRIVER)) throw new ForbiddenException('driver role required');
    next();
  }
}

@Injectable()
export class RequirePassengerOrDriverMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.some((r) => ([ROLES.PASSENGER, ROLES.DRIVER, ROLES.ADMIN, ROLES.SOS] as string[]).includes(r))) {
      throw new ForbiddenException('passenger/driver role required');
    }
    next();
  }
}

@Injectable()
export class RequireAdminOrSosMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SOS)) {
      throw new ForbiddenException(`${ROLES.ADMIN}/${ROLES.SOS} role required`);
    }
    next();
  }
}
