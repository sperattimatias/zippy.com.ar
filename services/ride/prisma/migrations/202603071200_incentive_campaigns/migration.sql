CREATE TABLE "IncentiveCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "target_trips" INTEGER,
  "target_hours" DOUBLE PRECISION,
  "starts_at" TIMESTAMP(3) NOT NULL,
  "ends_at" TIMESTAMP(3) NOT NULL,
  "payout_amount" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncentiveCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IncentiveCampaign_starts_at_ends_at_idx" ON "IncentiveCampaign"("starts_at", "ends_at");
CREATE INDEX "IncentiveCampaign_is_active_created_at_idx" ON "IncentiveCampaign"("is_active", "created_at");
