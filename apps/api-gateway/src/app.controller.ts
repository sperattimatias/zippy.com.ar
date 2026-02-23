import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('gateway')
@Controller()
export class AppController {
  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  health() {
    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    };
  }
}
