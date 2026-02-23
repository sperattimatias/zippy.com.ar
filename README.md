# zippy-rideshare

Monorepo para rideshare con auth centralizado, gateway RBAC y onboarding de conductores KYC-lite.

## Sprint 2 Highlights
- Onboarding conductor con estados (`PENDING_DOCS`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED`).
- Documentos privados en MinIO con URLs firmadas PUT/GET.
- Auditoría inmutable de acciones (`DriverEvent`).
- Panel admin para revisión y acciones de aprobación/rechazo/suspensión.
- Fix de sesión en admin-panel: **sin localStorage** (cookies httpOnly + BFF).

## Estructura
```text
apps/
  api-gateway
  admin-panel
services/
  auth
  driver
  ride
  payment
shared/
infra/
docs/
  AUTH.md
  RBAC.md
  DRIVER_KYC.md
  SECURITY_NOTES.md
```

## Variables de entorno
```bash
cp .env.example .env
```
Asegurar especialmente:
- `JWT_ACCESS_SECRET`
- `MINIO_*`
- `NEXT_PUBLIC_API_GATEWAY_URL`
- `API_GATEWAY_INTERNAL_URL`

## Comandos
```bash
docker compose -f infra/docker-compose.yml config
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
docker compose -f infra/docker-compose.yml ps
```

## Curl de verificación (Auth + Driver KYC)

### 1) Register + verify + login
```bash
curl -i -X POST https://api.zippy.local/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"driver1@zippy.com.ar","password":"MyS3curePassw0rd!"}'

curl -i -X POST https://api.zippy.local/api/auth/verify-email \
  -H 'Content-Type: application/json' \
  -d '{"email":"driver1@zippy.com.ar","code":"123456"}'

curl -i -X POST https://api.zippy.local/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"driver1@zippy.com.ar","password":"MyS3curePassw0rd!"}'
```

### 2) Solicitar perfil conductor
```bash
curl -i -X POST https://api.zippy.local/api/drivers/request \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 3) Presign documento
```bash
curl -i -X POST https://api.zippy.local/api/drivers/me/documents/presign \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"type":"SELFIE","mime_type":"image/jpeg","size_bytes":250000}'
```

### 4) Cargar archivo usando put_url
```bash
curl -X PUT "<PUT_URL>" \
  -H 'Content-Type: image/jpeg' \
  --data-binary @selfie.jpg
```

### 5) Admin pending/detail/review
```bash
curl -i https://api.zippy.local/api/admin/drivers/pending \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"

curl -i https://api.zippy.local/api/admin/drivers/<DRIVER_PROFILE_ID> \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"

curl -i -X POST https://api.zippy.local/api/admin/drivers/<DRIVER_PROFILE_ID>/review-start \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"

curl -i -X POST https://api.zippy.local/api/admin/drivers/<DRIVER_PROFILE_ID>/approve \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>"
```

### 6) Rechazar / suspender
```bash
curl -i -X POST https://api.zippy.local/api/admin/drivers/<DRIVER_PROFILE_ID>/reject \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"reason":"Documento ilegible"}'

curl -i -X POST https://api.zippy.local/api/admin/drivers/<DRIVER_PROFILE_ID>/suspend \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"reason":"Incumplimiento de políticas"}'
```

## Checklist Sprint 2
- [ ] `prisma migrate` aplicado en `services/driver`.
- [ ] `POST /drivers/request` crea profile `PENDING_DOCS`.
- [ ] `POST /drivers/me/documents/presign` devuelve `put_url`.
- [ ] `GET /admin/drivers/pending` lista pendientes con `docs_count`.
- [ ] `POST /admin/drivers/:id/approve` cambia a `APPROVED` y asigna rol `driver` en auth.
- [ ] Admin panel `/admin/drivers` y `/admin/drivers/[id]` funcionales.
- [ ] Sin localStorage para tokens (BFF + cookies httpOnly).
