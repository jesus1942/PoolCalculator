-- Add INSTALLER role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'INSTALLER';

-- Project organization scope
ALTER TABLE "Project" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Agenda event organization scope
ALTER TABLE "AgendaEvent" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AgendaEvent"
  ADD CONSTRAINT "AgendaEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Crew organization scope
ALTER TABLE "Crew" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Crew"
  ADD CONSTRAINT "Crew_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Agenda message images
ALTER TABLE "AgendaMessage" ADD COLUMN "images" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill organizationId from user currentOrgId where possible
UPDATE "Project" p
SET "organizationId" = u."currentOrgId"
FROM "User" u
WHERE p."organizationId" IS NULL
  AND p."userId" = u."id"
  AND u."currentOrgId" IS NOT NULL;

UPDATE "AgendaEvent" e
SET "organizationId" = u."currentOrgId"
FROM "User" u
WHERE e."organizationId" IS NULL
  AND e."ownerId" = u."id"
  AND u."currentOrgId" IS NOT NULL;

UPDATE "Crew" c
SET "organizationId" = u."currentOrgId"
FROM "User" u
WHERE c."organizationId" IS NULL
  AND c."ownerId" = u."id"
  AND u."currentOrgId" IS NOT NULL;
