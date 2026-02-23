# Financial Anti-Fraud (Sprint 9)

## Core entities
- `ClientFingerprint`: stores only SHA-256 hashes (ip, user-agent, optional device fingerprint)
- `FraudSignal`: atomic suspicious event with severity and risk delta
- `FraudCase`: review container for grouped signals
- `FinancialRiskScore`: 0..100 risk score
- `UserHold`: temporary controls (feature, payout, account)

## Signals (MVP)
- repeated pair trips
- suspicious low-distance repeated patterns
- shared IP over threshold (24h)
- shared device fingerprint over threshold (24h)

## Automatic actions
- HIGH risk: `FEATURE_LIMIT` hold (48h)
- CRITICAL risk: `PAYOUT_HOLD`

## Realtime
- `admin.fraud.case.created`
- `user.hold.applied`
- `user.hold.released`
