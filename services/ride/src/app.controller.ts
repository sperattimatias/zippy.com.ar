import { Controller, Get, Req } from '@nestjs/common';
import { getRequestId } from '../shared/utils/request-id';

@Controller()
export class AppController {
  @Get('health')
  health(@Req() req: any) {
    return {
      status: 'ok',
      service: 'ride',
      timestamp: new Date().toISOString(),
      requestId: getRequestId(req),
    };
  }

  @Get('ready')
  ready(@Req() req: any) {
    return {
      status: 'ok',
      service: 'ride',
      timestamp: new Date().toISOString(),
      requestId: getRequestId(req),
    };
  }
}
