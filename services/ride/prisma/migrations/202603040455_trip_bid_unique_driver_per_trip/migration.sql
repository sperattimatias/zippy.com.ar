-- Add bid update timestamp for reliable upsert semantics.
ALTER TABLE "TripBid"
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Resolve historical duplicates before enforcing uniqueness.
DELETE FROM "TripBid" a
USING "TripBid" b
WHERE a."trip_id" = b."trip_id"
  AND a."driver_user_id" = b."driver_user_id"
  AND a."created_at" < b."created_at";

DELETE FROM "TripBid" a
USING "TripBid" b
WHERE a."trip_id" = b."trip_id"
  AND a."driver_user_id" = b."driver_user_id"
  AND a."created_at" = b."created_at"
  AND a."id" < b."id";

CREATE UNIQUE INDEX "TripBid_trip_id_driver_user_id_key"
  ON "TripBid"("trip_id", "driver_user_id");
