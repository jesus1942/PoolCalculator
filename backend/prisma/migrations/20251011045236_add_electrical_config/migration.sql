-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "electricalConfig" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "BusinessRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAdditional" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "accessoryId" TEXT,
    "materialId" TEXT,
    "equipmentId" TEXT,
    "baseQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "dependencies" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAdditional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessRule_userId_category_idx" ON "BusinessRule"("userId", "category");

-- CreateIndex
CREATE INDEX "ProjectAdditional_projectId_idx" ON "ProjectAdditional"("projectId");

-- AddForeignKey
ALTER TABLE "BusinessRule" ADD CONSTRAINT "BusinessRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAdditional" ADD CONSTRAINT "ProjectAdditional_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAdditional" ADD CONSTRAINT "ProjectAdditional_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "AccessoryPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAdditional" ADD CONSTRAINT "ProjectAdditional_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ConstructionMaterialPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAdditional" ADD CONSTRAINT "ProjectAdditional_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "EquipmentPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
