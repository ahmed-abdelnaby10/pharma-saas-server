-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "genericNameEn" TEXT,
    "genericNameAr" TEXT,
    "barcode" TEXT,
    "sku" TEXT,
    "category" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "dosageForm" TEXT,
    "strength" TEXT,
    "manufacturer" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_barcode_key" ON "CatalogItem"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_sku_key" ON "CatalogItem"("sku");

-- CreateIndex
CREATE INDEX "CatalogItem_isActive_idx" ON "CatalogItem"("isActive");

-- CreateIndex
CREATE INDEX "CatalogItem_category_idx" ON "CatalogItem"("category");

-- CreateIndex
CREATE INDEX "CatalogItem_barcode_idx" ON "CatalogItem"("barcode");

-- CreateIndex
CREATE INDEX "CatalogItem_sku_idx" ON "CatalogItem"("sku");
