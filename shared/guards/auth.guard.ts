import { CanActivate, Injectable } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(): boolean {
    // Placeholder for JWT/Session validation.
    return true;
  }
}
