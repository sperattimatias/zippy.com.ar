CREATE TABLE "OutboxEvent" (
  "id" TEXT PRIMARY KEY,
  "aggregate_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "published_at" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX "OutboxEvent_published_at_created_at_idx" ON "OutboxEvent"("published_at", "created_at");
CREATE INDEX "OutboxEvent_aggregate_type_aggregate_id_created_at_idx" ON "OutboxEvent"("aggregate_type", "aggregate_id", "created_at");
