ALTER TABLE "CalculationSettings"
ALTER COLUMN "bedCementBagsPerM3" SET DEFAULT 0.5,
ALTER COLUMN "bedCementBagWeight" SET DEFAULT 25.0,
ALTER COLUMN "bedSandM3PerCementBag" SET DEFAULT 2.0;

UPDATE "CalculationSettings"
SET
  "bedCementBagsPerM3" = 0.5,
  "bedCementBagWeight" = 25.0,
  "bedSandM3PerCementBag" = 2.0
WHERE
  "bedCementBagWeight" = 50.0
  OR "bedSandM3PerCementBag" = 0.25
  OR "bedCementBagsPerM3" IN (4.0, 5.0);
