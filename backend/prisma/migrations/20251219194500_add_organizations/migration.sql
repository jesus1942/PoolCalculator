-- Add Organization and OrganizationMember tables
CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT,
  "ownerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

CREATE TABLE "OrganizationMember" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- Add currentOrgId to User
ALTER TABLE "User" ADD COLUMN "currentOrgId" TEXT;

-- Foreign keys
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_currentOrgId_fkey"
  FOREIGN KEY ("currentOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default organization and assign all existing users
DO $$
DECLARE
  default_org_id TEXT;
BEGIN
  INSERT INTO "Organization" ("id", "name", "slug", "ownerId", "createdAt", "updatedAt")
  VALUES (md5(random()::text || clock_timestamp()::text)::uuid, 'Domotics & IoT Solutions', 'domotics-iot', NULL, NOW(), NOW())
  RETURNING "id" INTO default_org_id;

  UPDATE "User"
  SET "currentOrgId" = default_org_id
  WHERE "currentOrgId" IS NULL;

  INSERT INTO "OrganizationMember" ("id", "organizationId", "userId", "role", "createdAt", "updatedAt")
  SELECT
    md5(random()::text || clock_timestamp()::text)::uuid,
    default_org_id,
    u."id",
    CASE
      WHEN u."role" = 'SUPERADMIN' THEN 'OWNER'
      WHEN u."role" = 'ADMIN' THEN 'ADMIN'
      WHEN u."role" = 'VIEWER' THEN 'VIEWER'
      ELSE 'MEMBER'
    END,
    NOW(),
    NOW()
  FROM "User" u
  ON CONFLICT ("organizationId", "userId") DO NOTHING;
END $$;
