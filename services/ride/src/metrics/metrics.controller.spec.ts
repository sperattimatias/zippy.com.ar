import { HEADERS_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  it('returns Prometheus text with core metric names', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService],
    }).compile();

    const controller = moduleRef.get(MetricsController);
    const service = moduleRef.get(MetricsService);
    const body = controller.getMetrics();

    expect(typeof body).toBe('string');
    expect(body).toContain('ride_request_total');
    expect(body).toContain('ride_request_duration_ms');
    expect(body).toContain('matching_duration_ms');
    expect(body).toContain('ws_connected_clients');
    expect(body).toContain('ws_subscribe_trip_total');
    expect(body).toContain('outbox_unpublished_count');
    expect(body).toContain('outbox_publish_total');
    expect(body).toContain('stream_pending_count');
    service.onModuleDestroy();
  });

  it('declares text/plain content-type for metrics endpoint', () => {
    const headers = Reflect.getMetadata(HEADERS_METADATA, MetricsController.prototype.getMetrics);
    expect(headers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Content-Type', value: 'text/plain; version=0.0.4; charset=utf-8' }),
      ]),
    );
  });
});
