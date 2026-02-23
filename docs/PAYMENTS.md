# Payments (Sprint 8)

## Endpoints
- `POST /payments/create-preference` (passenger)
- `POST /payments/webhook` (MercadoPago)
- `GET /drivers/finance/summary`
- `GET /drivers/finance/trips`
- `GET /admin/finance/trips`
- `GET /admin/finance/ledger`
- `GET /admin/finance/reconciliation?date=YYYY-MM-DD`

## Flow
1. Passenger creates preference from a completed trip.
2. Service freezes `commission_bps_applied` using active monthly bonus + floor.
3. Webhook validates signature and updates status.
4. On approval, settlement + ledger entries are persisted idempotently.
