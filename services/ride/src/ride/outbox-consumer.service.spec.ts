import { Test } from '@nestjs/testing';
import { REDIS_CLIENT } from '../infra/redis/redis.types';
import { MetricsService } from '../metrics/metrics.service';
import { OutboxConsumerService } from './outbox-consumer.service';

const createService = async (redis: any) => {
  const moduleRef = await Test.createTestingModule({
    providers: [
      OutboxConsumerService,
      { provide: REDIS_CLIENT, useValue: redis },
      { provide: MetricsService, useValue: { setStreamPendingCount: jest.fn() } },
    ],
  }).compile();
  return moduleRef.get(OutboxConsumerService);
};

describe('OutboxConsumerService', () => {
  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.INSTANCE_ID;
    delete process.env.MAX_STREAM_RETRIES;
  });

  it('creates consumer group idempotently when group already exists', async () => {
    const redis = {
      xgroup: jest.fn().mockRejectedValue(new Error('BUSYGROUP Consumer Group name already exists')),
      xpending: jest.fn().mockResolvedValue([]),
      xclaim: jest.fn(),
    };

    const service = await createService(redis);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(redis.xgroup).toHaveBeenCalledWith('CREATE', 'stream:trip-events', 'trip-events-group', '0', 'MKSTREAM');
  });

  it('does not call ensureGroup on each cron tick', async () => {
    const redis = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xpending: jest.fn().mockResolvedValue([]),
      xreadgroup: jest.fn().mockResolvedValue(null),
      xack: jest.fn(),
      xclaim: jest.fn(),
      hdel: jest.fn(),
    };

    const service = await createService(redis);
    await service.onModuleInit();
    await service.consumeStub();
    expect(redis.xgroup).toHaveBeenCalledTimes(1);
  });

  it('acks messages after successful processing', async () => {
    const redis = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xpending: jest.fn().mockResolvedValue([]),
      xreadgroup: jest.fn().mockResolvedValue([
        ['stream:trip-events', [['1710000000000-0', ['event_type', 'trip.created', 'aggregate_id', 't1', 'payload', '{}']]]],
      ]),
      xack: jest.fn().mockResolvedValue(1),
      xclaim: jest.fn(),
      hdel: jest.fn().mockResolvedValue(1),
    };

    const service = await createService(redis);
    await service.onModuleInit();
    await service.consumeBatch();

    expect(redis.xack).toHaveBeenCalledWith('stream:trip-events', 'trip-events-group', '1710000000000-0');
  });

  it('routes by event_type and handles pending recovery via xclaim', async () => {
    process.env.INSTANCE_ID = 'instance-1';
    const redis = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xpending: jest.fn().mockResolvedValueOnce([['1710000000001-0', 'other-consumer', 120000, 1]]).mockResolvedValueOnce([]),
      xclaim: jest.fn().mockResolvedValue([
        ['1710000000001-0', ['event_type', 'trip.matched', 'aggregate_id', 't2', 'payload', '{}']],
      ]),
      xack: jest.fn().mockResolvedValue(1),
      xreadgroup: jest.fn().mockResolvedValue(null),
      hdel: jest.fn().mockResolvedValue(1),
    };

    const service = await createService(redis);
    const routeSpy = jest.spyOn(service as any, 'routeEvent');

    await service.onModuleInit();
    await service.consumeStub();

    expect(redis.xclaim).toHaveBeenCalled();
    expect(routeSpy).toHaveBeenCalledWith(
      '1710000000001-0',
      expect.objectContaining({ event_type: 'trip.matched', aggregate_id: 't2' }),
    );
    expect(redis.xack).toHaveBeenCalledWith('stream:trip-events', 'trip-events-group', '1710000000001-0');
  });

  it('increments failure counter when handler fails', async () => {
    const redis = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xpending: jest.fn().mockResolvedValue([]),
      xreadgroup: jest.fn().mockResolvedValue([
        ['stream:trip-events', [['1710000000002-0', ['event_type', 'trip.created', 'aggregate_id', 't3', 'payload', '{"x":1}']]]],
      ]),
      xack: jest.fn().mockResolvedValue(1),
      xclaim: jest.fn(),
      hdel: jest.fn(),
      hincrby: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      xadd: jest.fn(),
    };

    const service = await createService(redis);
    jest.spyOn(service as any, 'routeEvent').mockRejectedValue(new Error('boom'));

    await service.onModuleInit();
    await service.consumeBatch();

    expect(redis.hincrby).toHaveBeenCalledWith('trip-events:failures', '1710000000002-0', 1);
    expect(redis.expire).toHaveBeenCalledWith('trip-events:failures', 24 * 60 * 60);
    expect(redis.xadd).not.toHaveBeenCalled();
    expect(redis.xack).not.toHaveBeenCalledWith('stream:trip-events', 'trip-events-group', '1710000000002-0');
  });

  it('moves message to DLQ and acks after max retries', async () => {
    process.env.MAX_STREAM_RETRIES = '2';
    const redis = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xpending: jest.fn().mockResolvedValue([]),
      xreadgroup: jest.fn().mockResolvedValue([
        ['stream:trip-events', [['1710000000003-0', ['event_type', 'trip.cancelled', 'aggregate_id', 't4', 'payload', '{"trip":"t4"}']]]],
      ]),
      xack: jest.fn().mockResolvedValue(1),
      xclaim: jest.fn(),
      hdel: jest.fn().mockResolvedValue(1),
      hincrby: jest.fn().mockResolvedValue(2),
      expire: jest.fn().mockResolvedValue(1),
      xadd: jest.fn().mockResolvedValue('1710000000004-0'),
    };

    const service = await createService(redis);
    jest.spyOn(service as any, 'routeEvent').mockRejectedValue(new Error('poison'));

    await service.onModuleInit();
    await service.consumeBatch();

    expect(redis.xadd).toHaveBeenCalledWith(
      'stream:trip-events:dlq',
      '*',
      'original_id',
      '1710000000003-0',
      'error_message',
      'poison',
      'event_type',
      'trip.cancelled',
      'payload',
      '{"trip":"t4"}',
    );
    expect(redis.xack).toHaveBeenCalledWith('stream:trip-events', 'trip-events-group', '1710000000003-0');
  });
});
