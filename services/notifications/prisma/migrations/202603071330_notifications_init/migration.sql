CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationTemplate_key_key" ON "NotificationTemplate"("key");
CREATE INDEX "NotificationTemplate_channel_is_active_idx" ON "NotificationTemplate"("channel", "is_active");

CREATE TABLE "NotificationSetting" (
  "event_key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updated_by" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("event_key")
);

CREATE TABLE "NotificationDeliveryLog" (
  "id" TEXT NOT NULL,
  "event_key" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "template_key" TEXT,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationDeliveryLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificationDeliveryLog_event_key_created_at_idx" ON "NotificationDeliveryLog"("event_key", "created_at");
CREATE INDEX "NotificationDeliveryLog_status_created_at_idx" ON "NotificationDeliveryLog"("status", "created_at");
