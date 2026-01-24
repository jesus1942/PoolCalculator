-- CreateTable
CREATE TABLE "CalculationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adhesiveKgPerM2" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "concreteBaseThicknessCm" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "cementKgPerM3" DOUBLE PRECISION NOT NULL DEFAULT 350.0,
    "sandM3PerM3" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "gravelM3PerM3" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "groutJointWidthMm" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "whiteCementKgPerLinealM" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "marmolinaKgPerLinealM" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "wireMeshOverlapCm" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "wireMeshM2PerM2" DOUBLE PRECISION NOT NULL DEFAULT 1.15,
    "waterproofingKgPerM2" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "waterproofingCoats" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalculationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalculationSettings_userId_key" ON "CalculationSettings"("userId");

-- AddForeignKey
ALTER TABLE "CalculationSettings" ADD CONSTRAINT "CalculationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
