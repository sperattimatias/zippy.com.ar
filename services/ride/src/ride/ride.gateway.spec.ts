import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from '../prisma/prisma.service';
import { RideGateway } from './ride.gateway';

type TestSocket = {
  id: string;
  handshake: { headers: Record<string, string>; auth: Record<string, string> };
  data: Record<string, unknown>;
  joinedRooms: Set<string>;
  join: jest.Mock;
};

describe('RideGateway trip subscription flow', () => {
  const prismaMock = {
    trip: {
      findUnique: jest.fn(),
    },
  };

  let gateway: RideGateway;
  let jwt: JwtService;

  const createSocket = (id: string, token: string): TestSocket => ({
    id,
    handshake: { headers: {}, auth: { token } },
    data: {},
    joinedRooms: new Set<string>(),
    join: jest.fn(async function (this: TestSocket, room: string) {
      this.joinedRooms.add(room);
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    jwt = new JwtService();
    gateway = new RideGateway(
      jwt,
      {
        getOrThrow: () => 'test-secret-which-is-long-enough-for-jwt',
      } as unknown as ConfigService,
      prismaMock as unknown as PrismaService,
    );

    (gateway as any).server = {
      to: jest.fn((room: string) => ({
        emit: (event: string, payload: unknown) => {
          for (const socket of [passengerSocket, intruderSocket]) {
            if (socket.joinedRooms.has(room)) receivedEvents.push({ socketId: socket.id, event, payload });
          }
        },
      })),
    };
  });

  let passengerSocket: TestSocket;
  let intruderSocket: TestSocket;
  let receivedEvents: Array<{ socketId: string; event: string; payload: unknown }>;

  it('authorizes trip room join and emits only to authorized subscribers', async () => {
    prismaMock.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      passenger_user_id: 'passenger-1',
      driver_user_id: 'driver-1',
    });

    receivedEvents = [];

    const passengerToken = jwt.sign({ sub: 'passenger-1', roles: ['passenger'] }, {
      secret: 'test-secret-which-is-long-enough-for-jwt',
    });
    const intruderToken = jwt.sign({ sub: 'intruder-1', roles: ['passenger'] }, {
      secret: 'test-secret-which-is-long-enough-for-jwt',
    });

    passengerSocket = createSocket('socket-passenger', passengerToken);
    intruderSocket = createSocket('socket-intruder', intruderToken);

    await gateway.handleConnection(passengerSocket as any);
    await gateway.handleConnection(intruderSocket as any);

    await expect(gateway.subscribeTrip(passengerSocket as any, { tripId: 'trip-1' })).resolves.toEqual({
      ok: true,
      room: 'trip:trip-1',
    });

    await expect(gateway.subscribeTrip(intruderSocket as any, { tripId: 'trip-1' })).rejects.toBeInstanceOf(
      WsException,
    );

    gateway.emitTrip('trip-1', 'trip.updated', { trip_id: 'trip-1', status: 'MATCHED' });

    expect(receivedEvents).toEqual([
      {
        socketId: 'socket-passenger',
        event: 'trip.updated',
        payload: { trip_id: 'trip-1', status: 'MATCHED' },
      },
    ]);
    expect(prismaMock.trip.findUnique).toHaveBeenCalledTimes(2);
  });
});
