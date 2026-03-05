CREATE TABLE "UserAdminMeta" (
  "user_id" TEXT NOT NULL,
  "payment_limited" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAdminMeta_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "UserAdminMeta_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
