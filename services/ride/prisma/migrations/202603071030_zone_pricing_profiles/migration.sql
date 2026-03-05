ALTER TABLE "GeoZone" ADD COLUMN "pricing_profile_key" TEXT;
ALTER TABLE "PremiumZone" ADD COLUMN "pricing_profile_key" TEXT;

CREATE INDEX "GeoZone_pricing_profile_key_idx" ON "GeoZone"("pricing_profile_key");
CREATE INDEX "PremiumZone_pricing_profile_key_idx" ON "PremiumZone"("pricing_profile_key");
