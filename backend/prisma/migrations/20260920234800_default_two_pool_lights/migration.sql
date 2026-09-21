-- PoolInstaller: todas las piscinas incluyen al menos dos luces por defecto.
-- Esto actualiza solamente el catálogo PoolPreset. Los proyectos ya creados
-- conservan su electricalConfig guardada y no se modifican retroactivamente.

ALTER TABLE "PoolPreset"
  ALTER COLUMN "hasLighting" SET DEFAULT true,
  ALTER COLUMN "lightingCount" SET DEFAULT 2;

UPDATE "PoolPreset"
SET
  "hasLighting" = true,
  "lightingCount" = GREATEST("lightingCount", 2)
WHERE "hasLighting" = false
   OR "lightingCount" < 2;
