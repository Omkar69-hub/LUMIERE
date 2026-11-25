CREATE TYPE "TicketStatus" AS ENUM ('OPEN','ANSWERED','CLOSED');
CREATE TABLE "SupportTicket" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"subject" TEXT NOT NULL,"message" TEXT NOT NULL,"response" TEXT,"status" "TicketStatus" NOT NULL DEFAULT 'OPEN',"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId","createdAt");
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status","createdAt");
