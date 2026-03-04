import { DriverGeoIndexService } from './driver-geo-index.service';

describe('DriverGeoIndexService', () => {
  it('upsert stores position and alive ttl keys', async () => {
    const redis = {
      geoadd: jest.fn().mockResolvedValue(1),
      set: jest.fn().mockResolvedValue('OK'),
    };
    const svc = new DriverGeoIndexService(redis as any);

    await svc.upsert('d1', -34.6, -58.4);

    expect(redis.geoadd).toHaveBeenCalledWith('drivers:geo', -58.4, -34.6, 'd1');
    expect(redis.set).toHaveBeenCalledWith('drivers:geo:alive:d1', '1', 'EX', 45);
  });

  it('findNearby returns only alive drivers', async () => {
    const redis = {
      georadius: jest.fn().mockResolvedValue(['d1', 'd2', 'd3']),
      mget: jest.fn().mockResolvedValue(['1', null, '1']),
    };
    const svc = new DriverGeoIndexService(redis as any);

    const ids = await svc.findNearby({ lat: -34.6, lng: -58.4, radiusMeters: 5000, limit: 10 });

    expect(ids).toEqual(['d1', 'd3']);
  });
});
