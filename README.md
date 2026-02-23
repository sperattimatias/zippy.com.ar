# zippy-rideshare

Monorepo rideshare con Auth centralizado, KYC de conductores y Ride Core con matching híbrido + realtime + OTP.

## Sprint 3 (Ride Core)
- FSM estricta de viaje.
- Bidding + accept bid + auto-match al expirar.
- Presencia de conductores online/offline/ping.
- OTP pickup (hash, expiración, intentos).
- Tracking de ubicación con rate limit.
- Cancelaciones justas + auditoría (`TripEvent`).
- Socket.IO con auth Bearer en handshake.

## Sprint 4 (Safety & Control)
- GeoZones CRUD (admin/sos).
- Detección de zonas RED/CAUTION por point-in-polygon.
- Detección de desvío de ruta respecto a baseline heurística.
- Detección de tracking perdido y alertas SOS/Admin.
- Safety alerts con flujo OPEN -> ACKNOWLEDGED/RESOLVED/DISMISSED.

## Comandos
```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml config
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
docker compose -f infra/docker-compose.yml ps
```

## Endpoints principales (gateway)
- Passenger:
  - `POST /api/trips/request`
  - `POST /api/trips/:id/accept-bid`
  - `POST /api/trips/:id/rate`
  - `POST /api/trips/:id/cancel`
- Driver:
  - `POST /api/drivers/presence/online`
  - `POST /api/drivers/presence/offline`
  - `POST /api/drivers/presence/ping`
  - `POST /api/trips/:id/bids`
  - `POST /api/trips/:id/driver/en-route`
  - `POST /api/trips/:id/driver/arrived`
  - `POST /api/trips/:id/driver/verify-otp`
  - `POST /api/trips/:id/location`
  - `POST /api/trips/:id/complete`
  - `POST /api/trips/:id/driver/cancel`
- Admin/SOS:
  - `GET /api/admin/trips`
  - `GET /api/admin/trips/:id`
  - `GET /api/admin/trips/:id/safety`
  - `POST /api/admin/geozones`
  - `GET /api/admin/geozones`
  - `PATCH /api/admin/geozones/:id`
  - `DELETE /api/admin/geozones/:id`
  - `GET /api/admin/safety-alerts`
  - `PATCH /api/admin/safety-alerts/:id`

## Curl ejemplo
```bash
# driver online
curl -i -X POST https://api.zippy.local/api/drivers/presence/online \
  -H "Authorization: Bearer <DRIVER_ACCESS_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"lat":-34.60,"lng":-58.38,"category":"AUTO"}'

# passenger request
curl -i -X POST https://api.zippy.local/api/trips/request \
  -H "Authorization: Bearer <PASSENGER_ACCESS_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"origin_lat":-34.60,"origin_lng":-58.38,"origin_address":"Obelisco","dest_lat":-34.58,"dest_lng":-58.41,"dest_address":"Palermo","category":"AUTO"}'

# driver bid
curl -i -X POST https://api.zippy.local/api/trips/<TRIP_ID>/bids \
  -H "Authorization: Bearer <DRIVER_ACCESS_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"price_offer":3200,"eta_to_pickup_minutes":6}'

# passenger accept
curl -i -X POST https://api.zippy.local/api/trips/<TRIP_ID>/accept-bid \
  -H "Authorization: Bearer <PASSENGER_ACCESS_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"bid_id":"<BID_ID>"}'

# driver arrived + verify otp
curl -i -X POST https://api.zippy.local/api/trips/<TRIP_ID>/driver/arrived -H "Authorization: Bearer <DRIVER_ACCESS_TOKEN>"
curl -i -X POST https://api.zippy.local/api/trips/<TRIP_ID>/driver/verify-otp \
  -H "Authorization: Bearer <DRIVER_ACCESS_TOKEN>" \
  -H 'Content-Type: application/json' -d '{"otp":"123456"}'
```

## Admin panel
- `/admin/trips`: listado de viajes recientes.
- `/admin/trips/[id]`: detalle, eventos, locations y sección safety.
- `/admin/geozones`: CRUD de zonas (MVP con JSON).
- `/admin/safety-alerts`: cola de alertas con acciones.

## Docs
- `docs/RIDE_FLOW.md`
- `docs/FSM.md`
- `docs/DRIVER_KYC.md`
- `docs/SECURITY_NOTES.md`
- `docs/AUTH.md`
- `docs/RBAC.md`
- `docs/SAFETY.md`
- `docs/GEOZONES.md`
- `docs/ALERTS.md`
