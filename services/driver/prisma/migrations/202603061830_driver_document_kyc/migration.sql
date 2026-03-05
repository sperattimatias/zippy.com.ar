CREATE TYPE "DriverDocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REUPLOAD_REQUESTED');

ALTER TABLE "DriverDocument"
  ADD COLUMN "status" "DriverDocumentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "review_reason" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMP(3),
  ADD COLUMN "reviewed_by_user_id" TEXT,
  ADD COLUMN "reupload_requested_at" TIMESTAMP(3),
  ADD COLUMN "expires_at" TIMESTAMP(3);
