CREATE TABLE "admin_audit_log" (
  "id" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log"("created_at");
CREATE INDEX "admin_audit_log_action_idx" ON "admin_audit_log"("action");
CREATE INDEX "admin_audit_log_entity_type_entity_id_idx" ON "admin_audit_log"("entity_type", "entity_id");
CREATE INDEX "admin_audit_log_admin_id_idx" ON "admin_audit_log"("admin_id");
