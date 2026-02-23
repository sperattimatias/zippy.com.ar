import { Body, Controller, Get, Headers, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAccessGuard } from '../common/jwt-access.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AdminFinanceTripsFilterDto, AdminLedgerFilterDto, CreatePreferenceDto, ReconciliationDto } from '../dto/payment.dto';
import { PaymentsService } from './payments.service';

type AuthReq = { user: { sub: string; roles: string[] }; body?: any; rawBody?: string };

@ApiTags('payments')
@ApiBearerAuth()
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payments/create-preference')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('passenger')
  createPreference(@Req() req: any, @Body() dto: CreatePreferenceDto) {
    return this.payments.createPreference(req.user.sub, dto.trip_id, { ip: req.headers['x-client-ip'], ua: req.headers['x-client-ua'], device: req.headers['x-device-fp'] });
  }

  @Post('payments/webhook')
  webhook(@Req() req: AuthReq, @Headers('x-signature') signature?: string) {
    return this.payments.processWebhook(JSON.stringify(req.body ?? {}), signature, req.body);
  }

  @Get('drivers/finance/summary')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('driver')
  driverSummary(@Req() req: AuthReq) {
    return this.payments.driverFinanceSummary(req.user.sub);
  }

  @Get('drivers/finance/trips')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('driver')
  driverTrips(@Req() req: AuthReq) {
    return this.payments.driverFinanceTrips(req.user.sub);
  }

  @Get('admin/finance/trips')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin', 'sos')
  adminTrips(@Query() query: AdminFinanceTripsFilterDto) {
    return this.payments.adminFinanceTrips(query);
  }

  @Get('admin/finance/ledger')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin', 'sos')
  adminLedger(@Query() query: AdminLedgerFilterDto) {
    return this.payments.adminLedger(query.actor_type);
  }

  @Get('admin/finance/reconciliation')
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles('admin', 'sos')
  adminReconciliation(@Query() query: ReconciliationDto) {
    return this.payments.adminReconciliation(query.date);
  }
}
