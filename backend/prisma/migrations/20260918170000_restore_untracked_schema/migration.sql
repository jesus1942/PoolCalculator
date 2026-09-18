-- Recupera cambios históricos hechos con db push que faltaban en migraciones.
-- No elimina tablas/columnas, recalcula importes ni modifica filas existentes.
-- IF NOT EXISTS conserva instalaciones cuyo esquema ya estaba actualizado.
-- Las restricciones fallan y revierten la transacción ante datos incompatibles.
BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "ProjectShare" LIMIT 1) AND (
    NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ProjectShare' AND column_name = 'clientUsername') OR
    NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ProjectShare' AND column_name = 'clientPassword')
  ) THEN
    RAISE EXCEPTION 'ProjectShare tiene accesos antiguos sin credenciales; requiere una migracion de acceso dedicada antes del despliegue.';
  END IF;
  IF EXISTS (SELECT "name" FROM "EquipmentPreset" GROUP BY "name" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'EquipmentPreset tiene nombres duplicados; revisar los equipos sin borrar ni fusionar datos automaticamente.';
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EquipmentCategory' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE "EquipmentCategory" AS ENUM ('REQUIRED', 'HEATING', 'ACCESSORIES', 'OPTIONAL');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContactStatus' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE "ContactStatus" AS ENUM ('PENDING', 'CONTACTED', 'CONVERTED', 'REJECTED', 'ARCHIVED');
  END IF;
END $$;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EquipmentType" ADD VALUE IF NOT EXISTS 'HEAT_PUMP';
ALTER TYPE "EquipmentType" ADD VALUE IF NOT EXISTS 'TRANSFORMER';
ALTER TYPE "EquipmentType" ADD VALUE IF NOT EXISTS 'SKIMMER';
ALTER TYPE "EquipmentType" ADD VALUE IF NOT EXISTS 'RETURN';
ALTER TYPE "EquipmentType" ADD VALUE IF NOT EXISTS 'HYDRO_JET';
ALTER TYPE "EquipmentType" ADD VALUE IF NOT EXISTS 'VACUUM_INTAKE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TileType" ADD VALUE IF NOT EXISTS 'ROMANA';
ALTER TYPE "TileType" ADD VALUE IF NOT EXISTS 'VENECIANA';
ALTER TYPE "TileType" ADD VALUE IF NOT EXISTS 'TROPICAL';
ALTER TYPE "TileType" ADD VALUE IF NOT EXISTS 'CLASICA';
ALTER TYPE "TileType" ADD VALUE IF NOT EXISTS 'MODERNA';

-- AlterTable
ALTER TABLE "AccessoryPreset" ADD COLUMN IF NOT EXISTS "additionalImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "catalogPage" TEXT,
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "AgendaMessage" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AgendaReminder" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CalculationSettings" ADD COLUMN IF NOT EXISTS "groutMarmolinaParts" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
ADD COLUMN IF NOT EXISTS "groutWhiteCementParts" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "ConstructionMaterialPreset" ADD COLUMN IF NOT EXISTS "additionalImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "bagWeight" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "catalogPage" TEXT,
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "EquipmentPreset" ADD COLUMN IF NOT EXISTS "additionalImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "catalogPage" TEXT,
ADD COLUMN IF NOT EXISTS "category" "EquipmentCategory" NOT NULL DEFAULT 'OPTIONAL',
ADD COLUMN IF NOT EXISTS "connectionSize" TEXT,
ADD COLUMN IF NOT EXISTS "consumption" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "datasheet" TEXT,
ADD COLUMN IF NOT EXISTS "filterArea" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "filterDiameter" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "flowRate" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "maxHead" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "maxPoolVolume" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "minPoolVolume" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "recommendedFilterModel" TEXT,
ADD COLUMN IF NOT EXISTS "recommendedPumpModel" TEXT,
ADD COLUMN IF NOT EXISTS "sandRequired" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "thermalPower" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PlumbingItem" ADD COLUMN IF NOT EXISTS "additionalImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "catalogPage" TEXT,
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "PoolPreset" ADD COLUMN IF NOT EXISTS "additionalImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "backDescription" TEXT,
ADD COLUMN IF NOT EXISTS "vendor" TEXT;

-- AlterTable
ALTER TABLE "ProjectAccess" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProjectAdditional" ADD COLUMN IF NOT EXISTS "generatedTaskId" TEXT,
ADD COLUMN IF NOT EXISTS "relatedTaskCategory" TEXT,
ADD COLUMN IF NOT EXISTS "requiredRoleId" TEXT;

-- AlterTable
ALTER TABLE "ProjectShare" ADD COLUMN IF NOT EXISTS "clientPassword" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "clientUsername" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PushSubscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TilePreset" ADD COLUMN IF NOT EXISTS "additionalImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "catalogPage" TEXT,
ADD COLUMN IF NOT EXISTS "cornerPricePerUnit" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "cornersPerTile" INTEGER,
ADD COLUMN IF NOT EXISTS "hasCorner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "isForFirstRing" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ContactForm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "QuoteRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "spaceLength" DOUBLE PRECISION,
    "spaceWidth" DOUBLE PRECISION,
    "selectedPoolId" TEXT,
    "additionalInfo" TEXT,
    "budget" TEXT,
    "timeframe" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CalculatorInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT,
    "poolId" TEXT,
    "poolName" TEXT,
    "spaceLength" DOUBLE PRECISION,
    "spaceWidth" DOUBLE PRECISION,
    "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalculatorInquiry_pkey" PRIMARY KEY ("id")
);

-- Tablas preexistentes: agregar solamente columnas ausentes.
-- Un campo obligatorio sin valor en una tabla poblada aborta y revierte; no inventamos datos.
ALTER TABLE "ContactForm" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "subject" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;

ALTER TABLE "QuoteRequest" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "location" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "spaceLength" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "spaceWidth" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "selectedPoolId" TEXT,
ADD COLUMN IF NOT EXISTS "additionalInfo" TEXT,
ADD COLUMN IF NOT EXISTS "budget" TEXT,
ADD COLUMN IF NOT EXISTS "timeframe" TEXT,
ADD COLUMN IF NOT EXISTS "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;

ALTER TABLE "CalculatorInquiry" ADD COLUMN IF NOT EXISTS "id" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "email" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL,
ADD COLUMN IF NOT EXISTS "message" TEXT,
ADD COLUMN IF NOT EXISTS "poolId" TEXT,
ADD COLUMN IF NOT EXISTS "poolName" TEXT,
ADD COLUMN IF NOT EXISTS "spaceLength" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "spaceWidth" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "status" "ContactStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContactForm_email_idx" ON "ContactForm"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContactForm_status_idx" ON "ContactForm"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ContactForm_createdAt_idx" ON "ContactForm"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuoteRequest_email_idx" ON "QuoteRequest"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuoteRequest_status_idx" ON "QuoteRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuoteRequest_createdAt_idx" ON "QuoteRequest"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalculatorInquiry_email_idx" ON "CalculatorInquiry"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalculatorInquiry_status_idx" ON "CalculatorInquiry"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CalculatorInquiry_createdAt_idx" ON "CalculatorInquiry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "EquipmentPreset_name_key" ON "EquipmentPreset"("name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectShare_clientUsername_key" ON "ProjectShare"("clientUsername");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectShare_clientUsername_idx" ON "ProjectShare"("clientUsername");


CREATE INDEX IF NOT EXISTS "PoolPreset_defaultPumpId_idx" ON "PoolPreset"("defaultPumpId");
CREATE INDEX IF NOT EXISTS "PoolPreset_defaultFilterId_idx" ON "PoolPreset"("defaultFilterId");

COMMIT;
