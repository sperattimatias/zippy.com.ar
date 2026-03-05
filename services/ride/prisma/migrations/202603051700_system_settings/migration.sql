CREATE TABLE "system_settings" (
  "key" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" TEXT,

  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");
