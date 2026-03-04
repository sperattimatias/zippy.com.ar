import { Test } from '@nestjs/testing';
import { REDIS_CLIENT } from '../infra/redis/redis.types';
import { RedisStateService } from './redis-state.service';

describe('RedisStateService', () => {
  it('falls back to memory for throttle when redis unavailable', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [RedisStateService, { provide: REDIS_CLIENT, useValue: null }],
    }).compile();
    const svc = moduleRef.get(RedisStateService);

    await expect(svc.tryAcquireLocationThrottle('t1', 'd1', 1)).resolves.toBe(true);
    await expect(svc.tryAcquireLocationThrottle('t1', 'd1', 1)).resolves.toBe(false);

    await new Promise((r) => setTimeout(r, 1100));
    await expect(svc.tryAcquireLocationThrottle('t1', 'd1', 1)).resolves.toBe(true);
  });

  it('stores tracking state/window and clears keys', async () => {
    const redis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValueOnce('major').mockResolvedValueOnce(JSON.stringify({ majorCount: 2 })),
      del: jest.fn().mockResolvedValue(1),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [RedisStateService, { provide: REDIS_CLIENT, useValue: redis }],
    }).compile();
    const svc = moduleRef.get(RedisStateService);

    await svc.setTrackingState('t1', 'major');
    await expect(svc.getTrackingState('t1')).resolves.toBe('major');

    await svc.setDeviationWindow('t1', { majorCount: 2 });
    await expect(svc.getDeviationWindow('t1')).resolves.toEqual({ majorCount: 2 });

    await svc.clearTripTrackingState('t1');
    expect(redis.del).toHaveBeenCalledWith('tracking:state:t1', 'tracking:window:t1');
  });
});
