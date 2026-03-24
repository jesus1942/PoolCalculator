ALTER TABLE "Project"
ADD COLUMN "projectCode" TEXT;

UPDATE "Project"
SET "projectCode" = 'PC-' || UPPER(SUBSTRING(REPLACE("id", '-', '') FROM 1 FOR 8))
WHERE "projectCode" IS NULL;

ALTER TABLE "Project"
ALTER COLUMN "projectCode" SET NOT NULL;

CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");
