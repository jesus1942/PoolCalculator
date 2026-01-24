/*
  Warnings:

  - You are about to drop the column `tileLines` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerM2` on the `TilePreset` table. All the data in the column will be lost.
  - Added the required column `tileConfig` to the `PoolPreset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `excavationDepth` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `excavationLength` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `excavationWidth` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tasks` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tileCalculation` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerUnit` to the `TilePreset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `TilePreset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TileType" AS ENUM ('COMMON', 'LOMO_BALLENA', 'L_FINISH', 'PERIMETER', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('PUMP', 'FILTER', 'HEATER', 'CHLORINATOR', 'LIGHTING', 'OTHER');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('CEMENT', 'WHITE_CEMENT', 'SAND', 'STONE', 'GRAVEL', 'MARMOLINA', 'WIRE_MESH', 'WIRE', 'NAILS', 'WATERPROOFING', 'GEOTEXTILE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccessoryType" ADD VALUE 'SKIMMER_ITEM';
ALTER TYPE "AccessoryType" ADD VALUE 'RETURN_ITEM';
ALTER TYPE "AccessoryType" ADD VALUE 'DRAIN_ITEM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectStatus" ADD VALUE 'BUDGETED';
ALTER TYPE "ProjectStatus" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "PoolPreset" ADD COLUMN     "floorCushionDepth" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
ADD COLUMN     "lateralCushionSpace" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
ADD COLUMN     "tileConfig" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "tileLines",
ADD COLUMN     "excavationDepth" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "excavationLength" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "excavationWidth" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "laborCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "materialCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "tasks" JSONB NOT NULL,
ADD COLUMN     "tileCalculation" JSONB NOT NULL,
ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TilePreset" DROP COLUMN "pricePerM2",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "pricePerUnit" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "type" "TileType" NOT NULL;

-- CreateTable
CREATE TABLE "EquipmentPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "power" DOUBLE PRECISION,
    "capacity" DOUBLE PRECISION,
    "voltage" INTEGER,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionMaterialPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "unit" TEXT NOT NULL,
    "mixRatio" JSONB,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstructionMaterialPreset_pkey" PRIMARY KEY ("id")
);
