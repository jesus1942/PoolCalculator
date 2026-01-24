-- CreateEnum
CREATE TYPE "ProfessionBillingType" AS ENUM ('HOUR', 'DAY', 'M2', 'ML', 'BOCA');

-- AlterTable
ALTER TABLE "ProfessionRole" ADD COLUMN "billingType" "ProfessionBillingType" NOT NULL DEFAULT 'HOUR';
ALTER TABLE "ProfessionRole" ADD COLUMN "ratePerUnit" DOUBLE PRECISION;
ALTER TABLE "ProfessionRole" ADD COLUMN "bocaRates" JSONB;
