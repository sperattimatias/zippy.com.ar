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
  - `DRIVER_EN_ROUTE -> CANCELLED_*`
  - `IN_PROGRESS -> CANCELLED_*` solo con razón `SAFETY`

## Reglas inválidas
- Completar si no está `IN_PROGRESS`.
- Verificar OTP fuera de `OTP_PENDING`.
- Bid fuera de `BIDDING`.

Las reglas inválidas deben responder error (`400`/`403`).
