-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "PoolShape" AS ENUM ('RECTANGULAR', 'CIRCULAR', 'OVAL', 'JACUZZI');

-- CreateEnum
CREATE TYPE "AccessoryType" AS ENUM ('CORNER', 'TRIM', 'GRILL', 'BASEBOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "depthEnd" DOUBLE PRECISION,
    "shape" "PoolShape" NOT NULL,
    "hasWetDeck" BOOLEAN NOT NULL DEFAULT false,
    "hasStairsOnly" BOOLEAN NOT NULL DEFAULT false,
    "returnsCount" INTEGER NOT NULL DEFAULT 2,
    "hasHotWaterReturn" BOOLEAN NOT NULL DEFAULT false,
    "hasBottomDrain" BOOLEAN NOT NULL DEFAULT true,
    "hasSkimmer" BOOLEAN NOT NULL DEFAULT true,
    "skimmerCount" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoolPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TilePreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "pricePerM2" DOUBLE PRECISION NOT NULL,
    "brand" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TilePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessoryPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccessoryType" NOT NULL,
    "unit" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccessoryPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "poolPresetId" TEXT NOT NULL,
    "perimeter" DOUBLE PRECISION NOT NULL,
    "waterMirrorArea" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "tileLines" JSONB NOT NULL,
    "totalTileArea" DOUBLE PRECISION NOT NULL,
    "sidewalkArea" DOUBLE PRECISION NOT NULL,
    "materials" JSONB NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "PoolPreset" ADD CONSTRAINT "PoolPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_poolPresetId_fkey" FOREIGN KEY ("poolPresetId") REFERENCES "PoolPreset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
