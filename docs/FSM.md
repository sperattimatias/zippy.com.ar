# FSM.md

## Transiciones permitidas (MVP)
- `BIDDING -> MATCHED` (accept-bid o auto-match)
- `BIDDING -> EXPIRED_NO_DRIVER` (sin bids)
- `MATCHED -> DRIVER_EN_ROUTE`
- `DRIVER_EN_ROUTE -> OTP_PENDING` (arrived)
- `OTP_PENDING -> IN_PROGRESS` (verify-otp)
- `IN_PROGRESS -> COMPLETED`
- cancelación:
  - `REQUESTED|BIDDING -> CANCELLED_*`
  - `MATCHED -> CANCELLED_BY_PASSENGER` (penalty `moderate` en MVP)
  - `DRIVER_EN_ROUTE -> CANCELLED_*`
  - `IN_PROGRESS -> CANCELLED_*` solo con razón `SAFETY`

## Atomicidad en AutoMatch
- AutoMatch se ejecuta con `prisma.$transaction`.
- El claim del viaje se hace con `updateMany(where: { id, status: BIDDING })`.
- Si `count === 0`, otro worker ya cambió el estado y se hace **skip** sin efectos secundarios.
- Solo si claim exitoso se actualizan bids (`AUTO_SELECTED` / `REJECTED`) y luego se emiten eventos.
- Esto hace el proceso idempotente y seguro bajo concurrencia.

## Reglas inválidas
- Completar si no está `IN_PROGRESS`.
- Verificar OTP fuera de `OTP_PENDING`.
- Bid fuera de `BIDDING`.

Las reglas inválidas deben responder error (`400`/`403`).
