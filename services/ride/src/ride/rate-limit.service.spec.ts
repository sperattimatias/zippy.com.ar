import { RateLimitService } from './rate-limit.service';

describe('RateLimitService', () => {
  it('allows requests under limit and blocks when exceeded in fallback mode', async () => {
    const service = new RateLimitService(null);

    await expect(service.isAllowed('k1', 2, 1)).resolves.toBe(true);
    await expect(service.isAllowed('k1', 2, 1)).resolves.toBe(true);
    await expect(service.isAllowed('k1', 2, 1)).resolves.toBe(false);
  });

  it('uses redis incr/expire when client is available', async () => {
    const redis = {
      incr: jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2),
      expire: jest.fn().mockResolvedValue(1),
    };
    const service = new RateLimitService(redis as any);

    await expect(service.isAllowed('k2', 2, 10)).resolves.toBe(true);
    await expect(service.isAllowed('k2', 2, 10)).resolves.toBe(true);

    expect(redis.incr).toHaveBeenCalledTimes(2);
    expect(redis.expire).toHaveBeenCalledTimes(1);
    expect(redis.expire).toHaveBeenCalledWith('k2', 10);
  });
});
