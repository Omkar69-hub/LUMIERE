CREATE TABLE "Category" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"slug" TEXT NOT NULL UNIQUE);
CREATE TABLE "Brand" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"slug" TEXT NOT NULL UNIQUE);
CREATE TABLE "Product" ("id" TEXT PRIMARY KEY,"slug" TEXT NOT NULL UNIQUE,"name" TEXT NOT NULL,"description" TEXT NOT NULL,"pricePaise" INTEGER NOT NULL CHECK ("pricePaise">=0),"published" BOOLEAN NOT NULL DEFAULT false,"categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"brandId" TEXT NOT NULL REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "ProductImage" ("id" TEXT PRIMARY KEY,"productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,"url" TEXT NOT NULL,"alt" TEXT NOT NULL,"position" INTEGER NOT NULL CHECK ("position">=0), UNIQUE("productId","position"));
CREATE TABLE "ProductVariant" ("id" TEXT PRIMARY KEY,"productId" TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,"sku" TEXT NOT NULL UNIQUE,"size" TEXT NOT NULL,"color" TEXT NOT NULL,"stock" INTEGER NOT NULL DEFAULT 0 CHECK ("stock">=0), UNIQUE("productId","size","color"));
CREATE INDEX "Product_published_createdAt_idx" ON "Product"("published","createdAt");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX "ProductVariant_size_color_stock_idx" ON "ProductVariant"("size","color","stock");
