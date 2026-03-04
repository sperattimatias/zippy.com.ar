import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from './ride.gateway';

type PollingClient = {
  sid: string;
  baseUrl: string;
  authHeader: string;
};

describe('RideGateway subscribeTrip integration', () => {
  let app: INestApplication;
  let port: number;
  let jwt: JwtService;
  let gateway: RideGateway;

  const prismaMock = {
    trip: {
      findUnique: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RideGateway,
        JwtService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key !== 'JWT_ACCESS_SECRET') throw new Error(`Unexpected key ${key}`);
              return 'test-secret-which-is-long-enough-for-jwt';
            },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.init();
    await app.listen(0);

    port = app.getHttpServer().address().port;
    jwt = app.get(JwtService);
    gateway = app.get(RideGateway);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      passenger_user_id: 'passenger-1',
      driver_user_id: 'driver-1',
    });
  });

  const baseUrl = () => `http://127.0.0.1:${port}/socket.io/`;

  const parseSid = (payload: string): string => {
    const sidMatch = payload.match(/"sid":"([^"]+)"/);
    if (!sidMatch) throw new Error(`sid missing in payload: ${payload}`);
    return sidMatch[1];
  };

  const pollingGet = async (url: string, authHeader: string, timeoutMs = 350): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { authorization: authHeader },
        signal: controller.signal,
      });
      return res.text();
    } finally {
      clearTimeout(timer);
    }
  };

  const pollingPost = async (url: string, authHeader: string, body: string): Promise<void> => {
    await fetch(url, {
      method: 'POST',
      headers: {
        authorization: authHeader,
        'content-type': 'text/plain;charset=UTF-8',
      },
      body,
    });
  };

  /**
   * Simulates socket handshake auth by sending bearer token in the initial polling request headers.
   */
  const connectPollingClient = async (userId: string): Promise<PollingClient> => {
    const token = jwt.sign(
      { sub: userId, roles: ['passenger'] },
      { secret: 'test-secret-which-is-long-enough-for-jwt' },
    );
    const authHeader = `Bearer ${token}`;
    const openUrl = `${baseUrl()}?EIO=4&transport=polling&t=${randomUUID()}`;
    const openPayload = await pollingGet(openUrl, authHeader);
    const sid = parseSid(openPayload);

    await pollingPost(`${baseUrl()}?EIO=4&transport=polling&sid=${sid}`, authHeader, '40/rides,');

    return { sid, baseUrl: baseUrl(), authHeader };
  };

  const emitSubscribeTrip = async (client: PollingClient, tripId: string) => {
    await pollingPost(
      `${client.baseUrl}?EIO=4&transport=polling&sid=${client.sid}`,
      client.authHeader,
      `42/rides,["subscribeTrip",{"tripId":"${tripId}"}]`,
    );
  };

  const waitForPacketContaining = async (
    client: PollingClient,
    text: string,
    timeoutMs = 1500,
  ): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const payload = await pollingGet(
          `${client.baseUrl}?EIO=4&transport=polling&sid=${client.sid}&t=${randomUUID()}`,
          client.authHeader,
        );
        if (payload.includes(text)) return true;
      } catch {
        // polling request timed out with no server packets, continue loop
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    return false;
  };

  it('authorized user subscribes and receives trip room events', async () => {
    const passenger = await connectPollingClient('passenger-1');

    await emitSubscribeTrip(passenger, 'trip-1');

    gateway.emitTrip('trip-1', 'trip.updated', { trip_id: 'trip-1', status: 'MATCHED' });

    await expect(waitForPacketContaining(passenger, 'trip.updated')).resolves.toBe(true);
    expect(prismaMock.trip.findUnique).toHaveBeenCalledWith({
      where: { id: 'trip-1' },
      select: { id: true, passenger_user_id: true, driver_user_id: true },
    });
  });

  it('unauthorized user cannot subscribe and does not receive trip room events', async () => {
    const intruder = await connectPollingClient('intruder-1');

    await emitSubscribeTrip(intruder, 'trip-1');

    gateway.emitTrip('trip-1', 'trip.updated', { trip_id: 'trip-1', status: 'MATCHED' });

    await expect(waitForPacketContaining(intruder, 'trip.updated', 500)).resolves.toBe(false);
    expect(prismaMock.trip.findUnique).toHaveBeenCalledWith({
      where: { id: 'trip-1' },
      select: { id: true, passenger_user_id: true, driver_user_id: true },
    });
  });
});
