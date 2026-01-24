DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrganizationRole') THEN
    CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'OrganizationMember'
      AND column_name = 'role'
      AND udt_name <> 'OrganizationRole'
  ) THEN
    ALTER TABLE "OrganizationMember"
      ALTER COLUMN role DROP DEFAULT;

    ALTER TABLE "OrganizationMember"
      ALTER COLUMN role TYPE "OrganizationRole" USING role::"OrganizationRole";

    ALTER TABLE "OrganizationMember"
      ALTER COLUMN role SET DEFAULT 'MEMBER';
  END IF;
END $$;
