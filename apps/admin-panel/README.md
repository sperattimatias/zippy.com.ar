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

## UI Kit (shadcn-style)

- A partir de ahora, los componentes visuales nuevos deben salir de `components/ui/*`.
- No importar componentes de UI directo en páginas desde librerías externas; usar siempre wrappers locales.

### Componentes base disponibles

- `button`, `card`, `badge`, `input`, `label`, `textarea`
- `select`, `tabs`, `dialog`, `dropdown-menu`, `tooltip`, `popover`
- `separator`, `skeleton`, `switch`, `scroll-area`
- `sonner` (`Toaster` + `toast`)

### Convención para agregar componentes nuevos

1. Crear el componente en `components/ui/<nombre>.tsx`.
2. Reutilizar `cn()` desde `lib/utils.ts` para componer clases.
3. Mantener variantes y API estables para no romper pantallas existentes.
4. Si se requiere dependencia externa, agregarla primero en `@zippy/admin-panel` y luego encapsularla en `components/ui/*`.
