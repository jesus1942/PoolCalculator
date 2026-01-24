-- CreateEnum
CREATE TYPE "PlumbingCategory" AS ENUM ('PIPE', 'FITTING', 'VALVE', 'ACCESSORY');

-- CreateEnum
CREATE TYPE "PlumbingType" AS ENUM ('PVC', 'FUSION_FUSION', 'FUSION_ROSCA', 'POLIPROPILENO', 'COBRE', 'OTHER');

-- AlterTable
ALTER TABLE "CalculationSettings" ALTER COLUMN "waterproofingKgPerM2" SET DEFAULT 0.0;

-- CreateTable
CREATE TABLE "PlumbingItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "PlumbingCategory" NOT NULL,
    "type" "PlumbingType" NOT NULL,
    "diameter" TEXT,
    "length" DOUBLE PRECISION,
    "unit" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlumbingItem_pkey" PRIMARY KEY ("id")
);
