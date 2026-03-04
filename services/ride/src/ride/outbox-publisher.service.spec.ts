import { OutboxPublisherService } from './outbox-publisher.service';

describe('OutboxPublisherService', () => {
  it('marks outbox event as published after successful stream publish', async () => {
    const xadd = jest.fn().mockResolvedValue('171001-0');
    const prisma: any = {
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'o1',
            aggregate_id: 'trip-1',
            event_type: 'trip.matched',
            payload_json: { trip_id: 'trip-1' },
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const service = new OutboxPublisherService(prisma, { xadd } as any);

    await service.publishPendingBatch(10);

    expect(xadd).toHaveBeenCalledWith(
      'stream:trip-events',
      '*',
      'event_type',
      'trip.matched',
      'aggregate_id',
      'trip-1',
      'payload',
      JSON.stringify({ trip_id: 'trip-1' }),
    );
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        data: expect.objectContaining({ published_at: expect.any(Date) }),
      }),
    );
  });

  it('increments attempts when publish fails', async () => {
    const prisma: any = {
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'o2',
            aggregate_id: 'trip-2',
            event_type: 'trip.updated',
            payload_json: { trip_id: 'trip-2' },
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const service = new OutboxPublisherService(
      prisma,
      { xadd: jest.fn().mockRejectedValue(new Error('boom')) } as any,
    );

    await service.publishPendingBatch(10);

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 'o2' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('skips publishing when Redis is unavailable', async () => {
    const prisma: any = {
      outboxEvent: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const service = new OutboxPublisherService(prisma, null);

    await expect(service.publishPendingBatch(10)).resolves.toBeUndefined();
    expect(prisma.outboxEvent.findMany).not.toHaveBeenCalled();
  });
});
