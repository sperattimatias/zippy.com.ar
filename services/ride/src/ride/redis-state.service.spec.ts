import { RedisStateService } from './redis-state.service';

describe('RedisStateService fallback', () => {
  it('enforces distributed throttle semantics with TTL in fallback mode', async () => {
    const svc = new RedisStateService();
    const first = await svc.tryAcquireLocationThrottle('t1', 'd1', 1);
    const second = await svc.tryAcquireLocationThrottle('t1', 'd1', 1);

    expect(first).toBe(true);
    expect(second).toBe(false);

    await new Promise((r) => setTimeout(r, 1100));

    const third = await svc.tryAcquireLocationThrottle('t1', 'd1', 1);
    expect(third).toBe(true);
  });

  it('stores and clears tracking state + deviation window', async () => {
    const svc = new RedisStateService();
    await svc.setTrackingState('trip-1', 'minor', 10);
    await svc.setDeviationWindow('trip-1', { majorCount: 2, over300Since: 1, over700Since: 2 }, 10);

    await expect(svc.getTrackingState('trip-1')).resolves.toBe('minor');
    await expect(svc.getDeviationWindow('trip-1')).resolves.toMatchObject({ majorCount: 2 });

    await svc.clearTripTrackingState('trip-1');

    await expect(svc.getTrackingState('trip-1')).resolves.toBe('none');
    await expect(svc.getDeviationWindow('trip-1')).resolves.toEqual({ majorCount: 0 });
  });
});
