# Ledger

`LedgerEntry` is append-only and auditable.

## Entry types
- `TRIP_REVENUE`
- `PLATFORM_COMMISSION`
- `DRIVER_EARNING`
- `BONUS_DISCOUNT`
- `REFUND`

## Idempotency
- Approved webhook path checks for existing driver earning entry per trip before inserting new entries.
- Replayed webhooks do not duplicate financial entries.
