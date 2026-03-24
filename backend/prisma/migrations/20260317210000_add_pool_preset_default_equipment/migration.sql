ALTER TABLE "PoolPreset"
ADD COLUMN "defaultPumpId" TEXT,
ADD COLUMN "defaultFilterId" TEXT;

ALTER TABLE "PoolPreset"
ADD CONSTRAINT "PoolPreset_defaultPumpId_fkey"
FOREIGN KEY ("defaultPumpId") REFERENCES "EquipmentPreset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PoolPreset"
ADD CONSTRAINT "PoolPreset_defaultFilterId_fkey"
FOREIGN KEY ("defaultFilterId") REFERENCES "EquipmentPreset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PoolPreset_defaultPumpId_idx" ON "PoolPreset"("defaultPumpId");
CREATE INDEX "PoolPreset_defaultFilterId_idx" ON "PoolPreset"("defaultFilterId");
