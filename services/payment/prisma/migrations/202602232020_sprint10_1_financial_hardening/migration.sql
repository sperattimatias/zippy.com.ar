-- Ensure FraudSignalType exists (fresh DBs were failing here)
DO $$ BEGIN
  CREATE TYPE "FraudSignalType" AS ENUM (
    'REPEATED_PAIR_TRIPS',
    'HIGH_VELOCITY_TRIPS',
    'HIGH_VELOCITY_PAYMENTS',
    'SHARED_IP_MULTIPLE_USERS',
    'SHARED_DEVICE_FINGERPRINT',
    'MULTIPLE_ACCOUNTS_SAME_DRIVER',
    'EXCESSIVE_REFUNDS',
    'REFUND_VELOCITY_HIGH',
    'REFUND_RATIO_HIGH',
    'PAYMENT_REJECT_RATE_HIGH',
    'SUSPICIOUS_ROUTE_PATTERN',
    'MANUAL_REVIEW_TRIGGER',
    'RISK_DECAY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "TripPayment" ADD COLUMN IF NOT EXISTS "refunded_at" TIMESTAMP(3);
ALTER TABLE "TripPayment" ADD COLUMN IF NOT EXISTS "is_fully_refunded" BOOLEAN NOT NULL DEFAULT false;

-- Keep these for older DBs where the type exists but lacks new values
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'REFUND_VELOCITY_HIGH';
ALTER TYPE "FraudSignalType" ADD VALUE IF NOT EXISTS 'REFUND_RATIO_HIGH';

DO $$ BEGIN
  CREATE TYPE "BonusAdjustmentStatus" AS ENUM ('PENDING', 'APPLIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "BonusAdjustment" (
  "id" TEXT NOT NULL,
  "driver_user_id" TEXT NOT NULL,
  "trip_id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "BonusAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
  "payload_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BonusAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BonusAdjustment_driver_user_id_year_month_idx" ON "BonusAdjustment"("driver_user_id", "year", "month");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BonusAdjustmentPending') THEN
    INSERT INTO "BonusAdjustment" ("id","driver_user_id","trip_id","year","month","amount","reason","status","payload_json","created_at")
    SELECT "id","driver_user_id","trip_id","year","month","amount","reason",'PENDING',COALESCE("payload_json", '{}'::jsonb),COALESCE("created_at", NOW())
    FROM "BonusAdjustmentPending"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;