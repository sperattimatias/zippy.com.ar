import { Test } from '@nestjs/testing';
import { REDIS_CLIENT } from '../infra/redis/redis.types';
import { DriverGeoIndexService } from './driver-geo-index.service';

describe('DriverGeoIndexService', () => {
  it('upsert stores in geo and alive ttl key', async () => {
    const redis = {
      geoadd: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [DriverGeoIndexService, { provide: REDIS_CLIENT, useValue: redis }],
    }).compile();
    const svc = moduleRef.get(DriverGeoIndexService);

    await svc.upsert('d1', -34.6, -58.4);

    expect(redis.geoadd).toHaveBeenCalledWith('drivers:geo', -58.4, -34.6, 'd1');
    expect(redis.set).toHaveBeenCalledWith('drivers:geo:alive:d1', '1', 'EX', 45);
  });

  it('findNearby filters out drivers with expired alive keys', async () => {
    const redis = {
      georadius: jest.fn().mockResolvedValue(['d1', 'd2']),
      mget: jest.fn().mockResolvedValue(['1', null]),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [DriverGeoIndexService, { provide: REDIS_CLIENT, useValue: redis }],
    }).compile();
    const svc = moduleRef.get(DriverGeoIndexService);

    await expect(svc.findNearby({ lat: -34.6, lng: -58.4, radiusMeters: 2000, limit: 20 })).resolves.toEqual(['d1']);
  });
});
