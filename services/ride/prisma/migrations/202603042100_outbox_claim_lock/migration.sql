ALTER TABLE "OutboxEvent"
  ADD COLUMN "locked_at" TIMESTAMP(3),
  ADD COLUMN "locked_by" TEXT;

CREATE INDEX "OutboxEvent_published_at_locked_at_created_at_idx"
  ON "OutboxEvent"("published_at", "locked_at", "created_at");
