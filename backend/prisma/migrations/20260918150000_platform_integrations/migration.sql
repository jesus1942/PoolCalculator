CREATE TABLE "PlatformIntegrationSetting" (
  "id" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformIntegrationSetting_pkey" PRIMARY KEY ("id")
);
