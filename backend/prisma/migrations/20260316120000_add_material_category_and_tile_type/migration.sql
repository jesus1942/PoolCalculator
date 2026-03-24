ALTER TYPE "MaterialType" ADD VALUE IF NOT EXISTS 'TILE';

DO $$
BEGIN
  CREATE TYPE "MaterialCategory" AS ENUM (
    'STRUCTURE',
    'BED',
    'JOINT',
    'FINISH',
    'WATERPROOFING',
    'DRAINAGE',
    'REINFORCEMENT',
    'TILES',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ConstructionMaterialPreset"
ADD COLUMN IF NOT EXISTS "category" "MaterialCategory" NOT NULL DEFAULT 'STRUCTURE';

UPDATE "ConstructionMaterialPreset"
SET "category" = CASE
  WHEN "type" = 'SAND' THEN 'BED'::"MaterialCategory"
  WHEN "type" IN ('WHITE_CEMENT', 'MARMOLINA') THEN 'JOINT'::"MaterialCategory"
  WHEN "type" = 'WATERPROOFING' THEN 'WATERPROOFING'::"MaterialCategory"
  WHEN "type" = 'GEOTEXTILE' THEN 'DRAINAGE'::"MaterialCategory"
  WHEN "type" = 'WIRE_MESH' THEN 'REINFORCEMENT'::"MaterialCategory"
  ELSE 'STRUCTURE'::"MaterialCategory"
END
WHERE "category" = 'STRUCTURE';
