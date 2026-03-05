import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  HttpCode,
  Ip,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from '../dto/register.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { LogoutDto } from '../dto/logout.dto';
import { GrantRoleDto } from '../dto/grant-role.dto';
import { AdminUserNoteDto, AdminUsersQueryDto, AdminUserPaymentLimitDto, AdminUserStatusDto } from '../dto/admin-user.dto';
import { JwtAccessGuard } from '../common/jwt-access.guard';
import { getRequestId } from '@shared/utils/request-id';
import { ROLES } from '@shared/enums/role.enum';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Auth health under /auth for gateway proxy checks' })
  authHealth(@Req() req: any) {
    return {
      status: 'ok',
      service: 'auth',
      timestamp: new Date().toISOString(),
      requestId: getRequestId(req),
    };
  }

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Register user and emit email verification code (mock in dev logs)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Verify email with one-time code' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Login and issue access+refresh tokens' })
  login(@Body() dto: LoginDto, @Headers('user-agent') userAgent: string, @Ip() ip: string) {
    return this.authService.login(dto, { userAgent, ip });
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access+refresh pair' })
  refresh(@Body() dto: RefreshDto, @Headers('user-agent') userAgent: string, @Ip() ip: string) {
    return this.authService.refresh(dto, { userAgent, ip });
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout current refresh token or all sessions' })
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @Post('admin/grant-role')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grant role to a user (admin/sos only)' })
  async grantRole(@Req() req: { user: { roles: string[] } }, @Body() dto: GrantRoleDto) {
    const roles = req.user.roles ?? [];
    if (!roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SOS)) {
      throw new ForbiddenException('admin/sos role required');
    }
    return this.authService.grantRole(dto.user_id, dto.role);
  }

  @Get('admin/users')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  async adminUsers(@Req() req: { user: { roles: string[] } }, @Query() query: AdminUsersQueryDto) {
    const roles = req.user.roles ?? [];
    if (!roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SOS)) {
      throw new ForbiddenException('admin/sos role required');
    }
    return this.authService.adminListUsers(query);
  }

  @Get('admin/users/:id')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  async adminUserDetail(@Req() req: { user: { roles: string[] } }, @Param('id') id: string) {
    const roles = req.user.roles ?? [];
    if (!roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SOS)) {
      throw new ForbiddenException('admin/sos role required');
    }
    return this.authService.adminUserDetail(id);
  }

  @Patch('admin/users/:id/status')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  async adminUserStatus(@Req() req: { user: { roles: string[] } }, @Param('id') id: string, @Body() dto: AdminUserStatusDto) {
    const roles = req.user.roles ?? [];
    if (!roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SOS)) {
      throw new ForbiddenException('admin/sos role required');
    }
    return this.authService.adminPatchUserStatus(id, dto.status);
  }

  @Patch('admin/users/:id/payment-limit')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  async adminUserPaymentLimit(@Req() req: { user: { roles: string[] } }, @Param('id') id: string, @Body() dto: AdminUserPaymentLimitDto) {
    const roles = req.user.roles ?? [];
    if (!roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SOS)) {
      throw new ForbiddenException('admin/sos role required');
    }
    return this.authService.adminPatchUserPaymentLimit(id, dto.payment_limited);
  }

  @Post('admin/users/:id/notes')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  async adminUserNotes(@Req() req: { user: { roles: string[] } }, @Param('id') id: string, @Body() dto: AdminUserNoteDto) {
    const roles = req.user.roles ?? [];
    if (!roles.includes(ROLES.ADMIN) && !roles.includes(ROLES.SOS)) {
      throw new ForbiddenException('admin/sos role required');
    }
    return this.authService.adminAddUserNote(id, dto.note);
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile and roles' })
  me(@Req() req: { user: { sub: string } }) {
    return this.authService.me(req.user.sub);
  }
}
