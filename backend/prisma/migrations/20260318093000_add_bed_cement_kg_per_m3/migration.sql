ALTER TABLE "CalculationSettings"
ADD COLUMN "bedCementKgPerM3" DOUBLE PRECISION NOT NULL DEFAULT 12.5;

UPDATE "CalculationSettings"
SET "bedCementKgPerM3" = CASE
  WHEN COALESCE("bedSandM3PerCementBag", 0) > 0
    THEN COALESCE("bedCementBagWeight", 25.0) / "bedSandM3PerCementBag"
  WHEN COALESCE("bedCementBagsPerM3", 0) > 0
    THEN COALESCE("bedCementBagWeight", 25.0) * "bedCementBagsPerM3"
  ELSE 12.5
END;
