-- Este campo existía en instalaciones actualizadas con db push, pero faltaba
-- en la cadena versionada. Debe existir antes de las migraciones de marzo.
-- IF NOT EXISTS conserva tanto el esquema como los valores de instalaciones vigentes.
ALTER TABLE "CalculationSettings"
ADD COLUMN IF NOT EXISTS "bedSandM3PerCementBag" DOUBLE PRECISION NOT NULL DEFAULT 2.0;
