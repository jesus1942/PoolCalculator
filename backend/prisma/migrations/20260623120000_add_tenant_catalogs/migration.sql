-- Catálogos por tenant: se agrega organizationId nullable a los 5 catálogos.
-- Las filas existentes quedan con organizationId NULL = catálogo global/base
-- compartido, de modo que ningún proyecto vivo cambia su comportamiento.

-- TilePreset
ALTER TABLE "TilePreset" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "TilePreset_organizationId_idx" ON "TilePreset"("organizationId");
ALTER TABLE "TilePreset"
  ADD CONSTRAINT "TilePreset_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AccessoryPreset
ALTER TABLE "AccessoryPreset" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "AccessoryPreset_organizationId_idx" ON "AccessoryPreset"("organizationId");
ALTER TABLE "AccessoryPreset"
  ADD CONSTRAINT "AccessoryPreset_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ConstructionMaterialPreset
ALTER TABLE "ConstructionMaterialPreset" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "ConstructionMaterialPreset_organizationId_idx" ON "ConstructionMaterialPreset"("organizationId");
ALTER TABLE "ConstructionMaterialPreset"
  ADD CONSTRAINT "ConstructionMaterialPreset_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- PlumbingItem
ALTER TABLE "PlumbingItem" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "PlumbingItem_organizationId_idx" ON "PlumbingItem"("organizationId");
ALTER TABLE "PlumbingItem"
  ADD CONSTRAINT "PlumbingItem_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- EquipmentPreset: además, el nombre pasa de único global a único por organización.
ALTER TABLE "EquipmentPreset" ADD COLUMN "organizationId" TEXT;
CREATE INDEX "EquipmentPreset_organizationId_idx" ON "EquipmentPreset"("organizationId");
ALTER TABLE "EquipmentPreset"
  ADD CONSTRAINT "EquipmentPreset_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "EquipmentPreset_name_key";
CREATE UNIQUE INDEX "EquipmentPreset_organizationId_name_key" ON "EquipmentPreset"("organizationId", "name");
