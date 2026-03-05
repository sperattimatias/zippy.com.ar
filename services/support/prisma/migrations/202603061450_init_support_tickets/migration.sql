CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TABLE "SupportTicket" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
  "user_id" TEXT NOT NULL,
  "driver_id" TEXT,
  "trip_id" TEXT,
  "description" TEXT NOT NULL,
  "assigned_agent" TEXT,
  "attachments_json" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicketNote" (
  "id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketNote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportTicketNote_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SupportTicket_status_created_at_idx" ON "SupportTicket"("status", "created_at");
CREATE INDEX "SupportTicket_user_id_created_at_idx" ON "SupportTicket"("user_id", "created_at");
CREATE INDEX "SupportTicketNote_ticket_id_created_at_idx" ON "SupportTicketNote"("ticket_id", "created_at");
