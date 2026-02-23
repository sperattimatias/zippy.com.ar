# zippy-rideshare

Monorepo profesional para plataforma rideshare con arquitectura orientada a microservicios.

## Stack
- **Gateway/API**: NestJS + Swagger + Throttling + reverse proxy interno.
- **Servicios**: NestJS + Prisma-ready (auth, ride, driver, payment).
- **Admin**: Next.js 14 + TailwindCSS.
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
│   ├── enums/
│   ├── dto/
│   ├── guards/
│   └── utils/
├── infra/
│   ├── docker-compose.yml
│   └── traefik/
└── README.md
```

## Requisitos (Ubuntu)

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## Variables de entorno

1. Copiar archivo base:

```bash
cp .env.example .env
```

2. Variables clave:

- `DATABASE_URL`: conexión PostgreSQL para servicios NestJS + Prisma.
- `REDIS_URL`: cola/cache distribuido.
- `CF_DNS_API_TOKEN`: token DNS challenge para Let's Encrypt con Cloudflare.
- `TRAEFIK_DOMAIN`: dominio raíz (ej: `zippy.com.ar`).
- `NEXT_PUBLIC_API_GATEWAY_URL`: URL pública de gateway usada por admin panel.

## Levantar entorno con Docker

Desde raíz del repo:

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

Ver estado:

```bash
docker compose -f infra/docker-compose.yml ps
```

Ver logs:

```bash
docker compose -f infra/docker-compose.yml logs -f --tail=100
```

Bajar stack:

```bash
docker compose -f infra/docker-compose.yml down -v
```


## Checklist de verificación (Sprint 0)

Ejecutar en este orden:

```bash
cp .env.example .env
```

```bash
docker compose -f infra/docker-compose.yml config
```

```bash
docker compose -f infra/docker-compose.yml --env-file .env up -d --build
```

```bash
docker compose -f infra/docker-compose.yml ps
```

```bash
curl -i https://api.${TRAEFIK_DOMAIN}/health
```

```bash
curl -i https://api.${TRAEFIK_DOMAIN}/api/auth/health
```

```bash
curl -i https://api.${TRAEFIK_DOMAIN}/api/rides/health
```

```bash
curl -i https://api.${TRAEFIK_DOMAIN}/api/drivers/health
```

```bash
curl -i https://api.${TRAEFIK_DOMAIN}/api/payments/health
```

```bash
docker compose -f infra/docker-compose.yml logs -f --tail=100 traefik api-gateway auth ride driver payment admin-panel
```

## Servicios y endpoints de health

- Gateway: `https://api.<TRAEFIK_DOMAIN>/health`
- Auth: `https://auth.<TRAEFIK_DOMAIN>/health`
- Ride: `https://ride.<TRAEFIK_DOMAIN>/health`
- Driver: `https://driver.<TRAEFIK_DOMAIN>/health`
- Payment: `https://payment.<TRAEFIK_DOMAIN>/health`
- Admin API route: `https://admin.<TRAEFIK_DOMAIN>/api/health`

## Gateway

Incluye:
- **Swagger** en `/docs`.
- **Rate limiting** básico global con `@nestjs/throttler`.
- **Proxy interno** para:
  - `/api/auth/*` -> `auth`
  - `/api/rides/*` -> `ride`
  - `/api/drivers/*` -> `driver`
  - `/api/payments/*` -> `payment`

## Traefik + Cloudflare (Full Strict)

Esta base está lista para **Cloudflare Full (strict)** con:
- certificados automáticos Let's Encrypt por DNS challenge (`cloudflare` provider),
- TLS 1.2+ y `sniStrict` en `infra/traefik/dynamic.yml`,
- enrutamiento por subdominios usando labels Docker.

Checklist recomendado en Cloudflare:
1. SSL/TLS mode: **Full (strict)**.
2. Crear token con permisos DNS edit del zone.
3. Cargar token en `.env` (`CF_DNS_API_TOKEN`).
4. Asegurar puertos 80/443 expuestos al host.

## Archivos clave

- `infra/docker-compose.yml`: orquestación de infraestructura + apps + servicios.
- `infra/traefik/dynamic.yml`: hardening TLS.
- `apps/api-gateway/src/main.ts`: bootstrap Nest + Swagger.
- `apps/api-gateway/src/app.module.ts`: validación env + throttling + proxy.
- `services/*/src/main.ts`: bootstraps con logging estructurado.
- `apps/admin-panel/app/page.tsx`: home con login placeholder.

## Roadmap sugerido

- Integrar Prisma migrations y seeds por servicio.
- Agregar auth real (JWT/OAuth2) y RBAC compartido.
- Implementar Socket.IO events concretos en `ride`.
- Añadir tracing distribuido (OpenTelemetry).
