-- AlterTable
ALTER TABLE "PoolPreset" ADD COLUMN     "hasHydroJets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasLighting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasVacuumIntake" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "hydroJetsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lightingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lightingType" TEXT,
ADD COLUMN     "vacuumIntakeCount" INTEGER NOT NULL DEFAULT 1;
