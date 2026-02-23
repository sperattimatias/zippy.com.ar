import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DriverService } from './driver.service';
import { PresignDocumentDto } from '../dto/presign-document.dto';
import { UpsertVehicleDto } from '../dto/upsert-vehicle.dto';
import { ReviewActionDto } from '../dto/review-action.dto';

type ReqUser = { headers: Record<string, string | undefined> };

@ApiTags('drivers')
@ApiBearerAuth()
@Controller()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post('drivers/request')
  request(@Req() req: ReqUser) {
    return this.driverService.requestDriver(req.headers['x-user-id']!);
  }

  @Get('drivers/me')
  me(@Req() req: ReqUser) {
    return this.driverService.me(req.headers['x-user-id']!);
  }

  @Post('drivers/me/documents/presign')
  presign(@Req() req: ReqUser, @Body() dto: PresignDocumentDto) {
    return this.driverService.presignDocument(req.headers['x-user-id']!, dto);
  }

  @Post('drivers/me/vehicle')
  upsertVehicle(@Req() req: ReqUser, @Body() dto: UpsertVehicleDto) {
    return this.driverService.upsertVehicle(req.headers['x-user-id']!, dto);
  }

  @Get('admin/drivers/pending')
  adminPending() {
    return this.driverService.adminPending();
  }

  @Get('admin/drivers/:id')
  adminDetail(@Param('id') id: string) {
    return this.driverService.adminDetail(id);
  }

  @Post('admin/drivers/:id/review-start')
  reviewStart(@Param('id') id: string, @Req() req: ReqUser) {
    return this.driverService.reviewStart(id, req.headers['x-user-id']!);
  }

  @Post('admin/drivers/:id/approve')
  approve(@Param('id') id: string, @Req() req: ReqUser) {
    return this.driverService.approve(id, req.headers['x-user-id']!, req.headers.authorization);
  }

  @Post('admin/drivers/:id/reject')
  reject(@Param('id') id: string, @Req() req: ReqUser, @Body() dto: ReviewActionDto) {
    return this.driverService.reject(id, req.headers['x-user-id']!, dto.reason ?? 'Rejected by reviewer');
  }

  @Post('admin/drivers/:id/suspend')
  suspend(@Param('id') id: string, @Req() req: ReqUser, @Body() dto: ReviewActionDto) {
    return this.driverService.suspend(id, req.headers['x-user-id']!, dto.reason ?? dto.notes ?? 'Suspended');
  }
}
