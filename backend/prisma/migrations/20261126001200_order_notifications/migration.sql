ALTER TYPE "FulfillmentStatus" ADD VALUE 'OUT_FOR_DELIVERY' BEFORE 'DELIVERED';
ALTER TABLE "Order" ADD COLUMN "whatsappNumber" TEXT;
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL','WHATSAPP');
CREATE TYPE "NotificationEvent" AS ENUM ('CONFIRMED','PACKING','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING','SENDING','ACCEPTED','REVIEW','SKIPPED');
CREATE TABLE "OrderNotification" (
 "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "channel" "NotificationChannel" NOT NULL,
 "event" "NotificationEvent" NOT NULL, "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "OrderNotification_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "OrderNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OrderNotification_orderId_channel_event_key" ON "OrderNotification"("orderId","channel","event");
CREATE INDEX "OrderNotification_status_createdAt_idx" ON "OrderNotification"("status","createdAt");
