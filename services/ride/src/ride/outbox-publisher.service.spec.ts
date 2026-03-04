import { OutboxPublisherService } from './outbox-publisher.service';

type Row = {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload_json: any;
  created_at: Date;
  published_at: Date | null;
  locked_at: Date | null;
  locked_by: string | null;
  attempts: number;
};

const matchesWhere = (row: Row, where: any): boolean => {
  if (!where) return true;

  if (where.id?.in && !where.id.in.includes(row.id)) return false;
  if (where.id && typeof where.id === 'string' && where.id !== row.id) return false;
  if (where.published_at === null && row.published_at !== null) return false;
  if (where.locked_by !== undefined && row.locked_by !== where.locked_by) return false;

  if (where.locked_at?.lt && !(row.locked_at && row.locked_at < where.locked_at.lt)) return false;
  if (where.locked_at?.gte && !(row.locked_at && row.locked_at >= where.locked_at.gte)) return false;

  if (where.OR) {
    const ok = where.OR.some((branch: any) => {
      if (branch.locked_at === null) return row.locked_at === null;
      if (branch.locked_at?.lt) return !!row.locked_at && row.locked_at < branch.locked_at.lt;
      return false;
    });
    if (!ok) return false;
  }

  return true;
};

const makeStatefulPrisma = (rows: Row[]) => ({
  outboxEvent: {
    findMany: jest.fn().mockImplementation(({ where, orderBy, take, select }: any = {}) => {
      let result = rows.filter((row) => matchesWhere(row, where));
      if (orderBy?.created_at === 'asc') {
        result = result.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      }
      if (typeof take === 'number') result = result.slice(0, take);
      if (select?.id) return result.map((r) => ({ id: r.id }));
      return result.map((r) => ({ ...r }));
    }),
    count: jest.fn().mockImplementation(({ where }: any = {}) => rows.filter((row) => matchesWhere(row, where)).length),
    updateMany: jest.fn().mockImplementation(({ where, data }: any) => {
      let count = 0;
      for (const row of rows) {
        if (!matchesWhere(row, where)) continue;
        count += 1;
        if (data.published_at !== undefined) row.published_at = data.published_at;
        if (data.locked_at !== undefined) row.locked_at = data.locked_at;
        if (data.locked_by !== undefined) row.locked_by = data.locked_by;
        if (data.attempts?.increment) row.attempts += data.attempts.increment;
      }
      return { count };
    }),
  },
});

describe('OutboxPublisherService', () => {
  it('marks outbox event as published after successful stream publish', async () => {
    const xadd = jest.fn().mockResolvedValue('171001-0');
    const rows: Row[] = [
      {
        id: 'o1',
        aggregate_id: 'trip-1',
        event_type: 'trip.matched',
        payload_json: { trip_id: 'trip-1' },
        created_at: new Date('2026-03-01T00:00:00.000Z'),
        published_at: null,
        locked_at: null,
        locked_by: null,
        attempts: 0,
      },
    ];
    const prisma: any = makeStatefulPrisma(rows);

    const service = new OutboxPublisherService(prisma, { xadd } as any, 'publisher-1');
    await service.publishPendingBatch(10);

    expect(xadd).toHaveBeenCalledTimes(1);
    expect(rows[0].published_at).toBeInstanceOf(Date);
    expect(rows[0].locked_at).toBeNull();
    expect(rows[0].locked_by).toBeNull();
  });

  it('increments attempts and unlocks row when publish fails', async () => {
    const rows: Row[] = [
      {
        id: 'o2',
        aggregate_id: 'trip-2',
        event_type: 'trip.updated',
        payload_json: { trip_id: 'trip-2' },
        created_at: new Date('2026-03-01T00:00:00.000Z'),
        published_at: null,
        locked_at: null,
        locked_by: null,
        attempts: 0,
      },
    ];
    const prisma: any = makeStatefulPrisma(rows);

    const service = new OutboxPublisherService(
      prisma,
      { xadd: jest.fn().mockRejectedValue(new Error('boom')) } as any,
      'publisher-1',
    );

    await service.publishPendingBatch(10);

    expect(rows[0].attempts).toBe(1);
    expect(rows[0].published_at).toBeNull();
    expect(rows[0].locked_at).toBeNull();
    expect(rows[0].locked_by).toBeNull();
  });

  it('skips publishing when Redis is unavailable', async () => {
    const prisma: any = {
      outboxEvent: {
        findMany: jest.fn(),
        count: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const service = new OutboxPublisherService(prisma, null, 'publisher-1');

    await expect(service.publishPendingBatch(10)).resolves.toBeUndefined();
    expect(prisma.outboxEvent.findMany).not.toHaveBeenCalled();
  });

  it('claims rows without overlap between two concurrent publishers', async () => {
    const rows: Row[] = [
      {
        id: 'o1',
        aggregate_id: 'trip-1',
        event_type: 'trip.created',
        payload_json: {},
        created_at: new Date('2026-03-01T00:00:00.000Z'),
        published_at: null,
        locked_at: null,
        locked_by: null,
        attempts: 0,
      },
      {
        id: 'o2',
        aggregate_id: 'trip-2',
        event_type: 'trip.created',
        payload_json: {},
        created_at: new Date('2026-03-01T00:00:01.000Z'),
        published_at: null,
        locked_at: null,
        locked_by: null,
        attempts: 0,
      },
    ];
    const prisma: any = makeStatefulPrisma(rows);

    const serviceA = new OutboxPublisherService(prisma, { xadd: jest.fn() } as any, 'A');
    const serviceB = new OutboxPublisherService(prisma, { xadd: jest.fn() } as any, 'B');

    const [claimedA, claimedB] = await Promise.all([
      serviceA.claimPendingBatch(2, 60, new Date('2026-03-01T00:00:10.000Z')),
      serviceB.claimPendingBatch(2, 60, new Date('2026-03-01T00:00:10.000Z')),
    ]);

    const idsA = new Set(claimedA.map((ev: any) => ev.id));
    const idsB = new Set(claimedB.map((ev: any) => ev.id));
    const overlap = [...idsA].filter((id) => idsB.has(id));

    expect(overlap).toEqual([]);
    expect(idsA.size + idsB.size).toBe(2);
  });

  it('reclaims stale locks after lease timeout', async () => {
    const staleLockAt = new Date('2026-03-01T00:00:00.000Z');
    const now = new Date('2026-03-01T00:02:00.000Z');
    const rows: Row[] = [
      {
        id: 'o1',
        aggregate_id: 'trip-1',
        event_type: 'trip.created',
        payload_json: {},
        created_at: new Date('2026-03-01T00:00:00.000Z'),
        published_at: null,
        locked_at: staleLockAt,
        locked_by: 'old-instance',
        attempts: 0,
      },
    ];

    const prisma: any = makeStatefulPrisma(rows);
    const service = new OutboxPublisherService(prisma, { xadd: jest.fn() } as any, 'new-instance');

    const claimed = await service.claimPendingBatch(10, 60, now);

    expect(claimed).toHaveLength(1);
    expect(claimed[0].id).toBe('o1');
    expect(rows[0].locked_by).toBe('new-instance');
    expect(rows[0].locked_at).toEqual(now);
  });

  it('uses env tunables for lease seconds and batch size with safe defaults', async () => {
    process.env.OUTBOX_LEASE_SECONDS = '120';
    process.env.OUTBOX_BATCH_SIZE = '15';

    const rows: Row[] = [];
    const prisma: any = makeStatefulPrisma(rows);
    const service = new OutboxPublisherService(prisma, { xadd: jest.fn() } as any, 'publisher-1');

    const claimSpy = jest.spyOn(service, 'claimPendingBatch').mockResolvedValue([] as any);
    await service.publishPendingBatch();

    expect(claimSpy).toHaveBeenCalledWith(15, 120);

    delete process.env.OUTBOX_LEASE_SECONDS;
    delete process.env.OUTBOX_BATCH_SIZE;

    process.env.OUTBOX_LEASE_SECONDS = 'bad';
    process.env.OUTBOX_BATCH_SIZE = '0';
    const serviceWithInvalid = new OutboxPublisherService(prisma, { xadd: jest.fn() } as any, 'publisher-1');
    const claimSpyInvalid = jest.spyOn(serviceWithInvalid, 'claimPendingBatch').mockResolvedValue([] as any);

    await serviceWithInvalid.publishPendingBatch();
    expect(claimSpyInvalid).toHaveBeenCalledWith(50, 60);

    delete process.env.OUTBOX_LEASE_SECONDS;
    delete process.env.OUTBOX_BATCH_SIZE;
  });

});
