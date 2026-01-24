-- Add exportSettings JSON for document customization
ALTER TABLE "Project" ADD COLUMN "exportSettings" JSONB NOT NULL DEFAULT '{}'::jsonb;
