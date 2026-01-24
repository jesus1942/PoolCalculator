-- AlterTable
ALTER TABLE "CalculationSettings" ALTER COLUMN "cementKgPerM3" SET DEFAULT 200.0;

-- CreateTable
CREATE TABLE "ProfessionRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hourlyRate" DOUBLE PRECISION,
    "dailyRate" DOUBLE PRECISION,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionRole_userId_name_key" ON "ProfessionRole"("userId", "name");

-- AddForeignKey
ALTER TABLE "ProfessionRole" ADD CONSTRAINT "ProfessionRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
