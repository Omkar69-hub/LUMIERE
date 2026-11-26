CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'COD');
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'ONLINE';
