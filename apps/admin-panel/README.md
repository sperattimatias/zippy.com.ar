# Admin Panel (Zippy)

## Ejecutar en desarrollo

Desde la raíz del monorepo:

```bash
pnpm install
pnpm --filter @zippy/admin-panel dev
```

App disponible en `http://localhost:3005`.

## Build de producción

```bash
pnpm --filter @zippy/admin-panel build
pnpm --filter @zippy/admin-panel start
```

## Notas

- El panel usa `app/api/*` como proxy hacia API Gateway.
- Requiere variables `API_GATEWAY_INTERNAL_URL` o `NEXT_PUBLIC_API_GATEWAY_URL`.
