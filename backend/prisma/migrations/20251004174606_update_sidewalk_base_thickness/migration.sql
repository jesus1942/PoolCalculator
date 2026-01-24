/*
  Warnings:

  - You are about to drop the column `concreteBaseThicknessCm` on the `CalculationSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CalculationSettings" DROP COLUMN "concreteBaseThicknessCm",
ADD COLUMN     "sidewalkBaseThicknessCm" DOUBLE PRECISION NOT NULL DEFAULT 10.0;
