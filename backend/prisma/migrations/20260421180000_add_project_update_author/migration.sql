ALTER TABLE "ProjectUpdate" ADD COLUMN "createdById" TEXT;

CREATE INDEX "ProjectUpdate_createdById_idx" ON "ProjectUpdate"("createdById");

ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
