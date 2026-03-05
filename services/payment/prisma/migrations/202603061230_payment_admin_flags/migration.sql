CREATE TABLE "PaymentAdminFlag" (
  "trip_payment_id" TEXT NOT NULL,
  "duplicate_flag" BOOLEAN NOT NULL DEFAULT false,
  "not_settled_flag" BOOLEAN NOT NULL DEFAULT false,
  "note" TEXT,
  "updated_by" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAdminFlag_pkey" PRIMARY KEY ("trip_payment_id"),
  CONSTRAINT "PaymentAdminFlag_trip_payment_id_fkey" FOREIGN KEY ("trip_payment_id") REFERENCES "TripPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
