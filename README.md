# zippy-rideshare

Monorepo profesional para plataforma rideshare con arquitectura orientada a microservicios.

## Stack
- **Gateway/API**: NestJS + Swagger + Throttling + reverse proxy interno + Bearer RBAC.
- **Servicios**: NestJS + Prisma (auth, ride, driver, payment).
- **Admin**: Next.js 14 + TailwindCSS + login real (MVP).
- **Infra**: Docker Compose + Traefik + PostgreSQL + Redis + MinIO.

## Estructura del monorepo

```text
zippy-rideshare/
├── apps/
│   ├── api-gateway/
│   └── admin-panel/
├── services/
│   ├── auth/
│   ├── ride/
│   ├── driver/
│   └── payment/
├── shared/
├── infra/
├── docs/
│   ├── AUTH.md
│   └── RBAC.md
└── README.md
```

## Variables de entorno clave

```bash
cp .env.example .env
```

- `JWT_ACCESS_SECRET`: secreto HS256 (>=32 chars)
- `JWT_ACCESS_EXPIRES_IN`: default `15m`
- `REFRESH_TOKEN_EXPIRES_DAYS`: default `30`
- `EMAIL_VERIFICATION_TTL_MIN`: default `10`
- `NEXT_PUBLIC_API_GATEWAY_URL`: URL pública del gateway
- `API_GATEWAY_INTERNAL_URL`: URL interna desde Next API routes

## Levantar entorno

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

```bash
docker compose -f infra/docker-compose.yml ps
```

## Verificación Sprint 1 (curl end-to-end)

> Asumiendo `TRAEFIK_DOMAIN=zippy.local` y gateway en `https://api.zippy.local`.

### 1) Register
```bash
curl -i -X POST https://api.zippy.local/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zippy.com.ar","password":"MyS3curePassw0rd!"}'
```

### 2) Verify email
Tomar el código que imprime `services/auth` en logs de desarrollo.
```bash
curl -i -X POST https://api.zippy.local/api/auth/verify-email \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zippy.com.ar","code":"123456"}'
```

### 3) Login
```bash
curl -i -X POST https://api.zippy.local/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@zippy.com.ar","password":"MyS3curePassw0rd!"}'
```

### 4) Me
```bash
curl -i https://api.zippy.local/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 5) Refresh (rotativo)
```bash
curl -i -X POST https://api.zippy.local/api/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token":"<REFRESH_TOKEN>"}'
```

### 6) Logout
```bash
curl -i -X POST https://api.zippy.local/api/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{"refresh_token":"<REFRESH_TOKEN>"}'
```

### 7) Proxy checks desde gateway
```bash
curl -i https://api.zippy.local/api/auth/health
curl -i https://api.zippy.local/api/rides/health
curl -i https://api.zippy.local/api/drivers/health
curl -i https://api.zippy.local/api/payments/health
```

## Swagger
- Gateway docs: `https://api.<TRAEFIK_DOMAIN>/docs`
- Auth docs: `https://auth.<TRAEFIK_DOMAIN>/docs`

## Checklist de verificación
- [ ] `docker compose -f infra/docker-compose.yml config` sin errores.
- [ ] `POST /api/auth/register` crea usuario + código de verificación.
- [ ] `POST /api/auth/verify-email` marca email verificado.
- [ ] `POST /api/auth/login` retorna access+refresh.
- [ ] `POST /api/auth/refresh` rota refresh token y el viejo deja de servir.
- [ ] `POST /api/auth/logout` revoca sesión.
- [ ] `GET /api/auth/me` retorna roles.
- [ ] Admin panel `/login` funciona y `/admin/dashboard` restringe a `admin|sos`.

## Seguridad aplicada
- Access token corto (HS256).
- Refresh token rotativo con revocación.
- Hash Argon2id para password.
- Hash SHA-256 para verification code y refresh token.
- Rate limiting en endpoints críticos de auth.
