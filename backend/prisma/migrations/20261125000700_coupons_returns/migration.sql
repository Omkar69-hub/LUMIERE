ALTER TABLE "Order" ADD COLUMN "discountPaise" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Order" DROP CONSTRAINT "Order_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_check" CHECK ("discountPaise">=0 AND "discountPaise"<="subtotalPaise" AND "totalPaise"="subtotalPaise"+"shippingPaise"-"discountPaise");
CREATE TABLE "Coupon" ("code" TEXT PRIMARY KEY,"percent" INTEGER NOT NULL CHECK ("percent" BETWEEN 1 AND 90),"minimumPaise" INTEGER NOT NULL DEFAULT 0 CHECK ("minimumPaise">=0),"active" BOOLEAN NOT NULL DEFAULT false,"expiresAt" TIMESTAMP(3),"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TYPE "ReturnStatus" AS ENUM ('REQUESTED','APPROVED','REJECTED','RECEIVED');
CREATE TABLE "ReturnRequest" ("id" TEXT PRIMARY KEY,"orderId" TEXT NOT NULL UNIQUE REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"reason" TEXT NOT NULL,"status" "ReturnStatus" NOT NULL DEFAULT 'REQUESTED',"reviewNote" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "ReturnRequest_status_createdAt_idx" ON "ReturnRequest"("status","createdAt");
