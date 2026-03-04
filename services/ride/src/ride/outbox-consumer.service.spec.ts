import { OutboxConsumerService } from './outbox-consumer.service';

describe('OutboxConsumerService', () => {
  const loggerDebug = jest
    .spyOn((OutboxConsumerService as any).prototype['logger'] ?? console, 'debug' as any)
    .mockImplementation(() => undefined);

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.INSTANCE_ID;
  });

  afterAll(() => {
    loggerDebug.mockRestore();
  });

  it('creates consumer group idempotently when group already exists', async () => {
    const redis = {
      xgroup: jest.fn().mockRejectedValue(new Error('BUSYGROUP Consumer Group name already exists')),
      xpending: jest.fn().mockResolvedValue([]),
    };

    const service = new OutboxConsumerService(redis as any);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    expect(redis.xgroup).toHaveBeenCalledWith('CREATE', 'stream:trip-events', 'trip-events-group', '0', 'MKSTREAM');
  });

  it('acks messages after successful processing', async () => {
    const redis = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xpending: jest.fn().mockResolvedValue([]),
      xreadgroup: jest.fn().mockResolvedValue([
        [
          'stream:trip-events',
          [
            ['1710000000000-0', ['event_type', 'trip.created', 'aggregate_id', 't1', 'payload', '{}']],
          ],
        ],
      ]),
      xack: jest.fn().mockResolvedValue(1),
    };

    const service = new OutboxConsumerService(redis as any);
    await service.consumeBatch();

    expect(redis.xack).toHaveBeenCalledWith('stream:trip-events', 'trip-events-group', '1710000000000-0');
  });

  it('routes by event_type and handles pending recovery via xclaim', async () => {
    process.env.INSTANCE_ID = 'instance-1';
    const redis = {
      xgroup: jest.fn().mockResolvedValue('OK'),
      xpending: jest
        .fn()
        .mockResolvedValueOnce([['1710000000001-0', 'other-consumer', 120000, 1]])
        .mockResolvedValueOnce([]),
      xclaim: jest.fn().mockResolvedValue([
        ['1710000000001-0', ['event_type', 'trip.matched', 'aggregate_id', 't2', 'payload', '{}']],
      ]),
      xack: jest.fn().mockResolvedValue(1),
      xreadgroup: jest.fn().mockResolvedValue(null),
    };

    const service = new OutboxConsumerService(redis as any);
    const routeSpy = jest.spyOn(service as any, 'routeEvent');

    await service.consumeStub();

    expect(redis.xclaim).toHaveBeenCalled();
    expect(routeSpy).toHaveBeenCalledWith(
      '1710000000001-0',
      expect.objectContaining({ event_type: 'trip.matched', aggregate_id: 't2' }),
    );
    expect(redis.xack).toHaveBeenCalledWith('stream:trip-events', 'trip-events-group', '1710000000001-0');
  });
});
