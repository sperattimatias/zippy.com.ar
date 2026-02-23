import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'driver',
      timestamp: new Date().toISOString(),
      notes: 'Driver lifecycle + Prisma base service',
    };
  }
}
