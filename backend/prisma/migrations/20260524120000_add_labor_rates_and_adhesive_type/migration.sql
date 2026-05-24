-- Add ADHESIVE to MaterialType enum
ALTER TYPE "MaterialType" ADD VALUE 'ADHESIVE';

-- Add labor rate fields to CalculationSettings
ALTER TABLE "CalculationSettings"
  ADD COLUMN "tileInstallerRatePerM2" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "excavationRatePerM3"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "finishingRatePerM2"     DOUBLE PRECISION NOT NULL DEFAULT 0;
