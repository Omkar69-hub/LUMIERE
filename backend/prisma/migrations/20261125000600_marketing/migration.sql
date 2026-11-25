ALTER TABLE "Product" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "StoreCampaign" ("id" TEXT PRIMARY KEY,"announcement" TEXT NOT NULL,"headline" TEXT NOT NULL,"description" TEXT NOT NULL,"imageUrl" TEXT,"imageAlt" TEXT,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "NewsletterSubscriber" ("email" TEXT PRIMARY KEY,"consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
