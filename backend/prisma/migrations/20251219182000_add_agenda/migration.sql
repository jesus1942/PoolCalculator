-- CreateEnum
CREATE TYPE "CrewRole" AS ENUM ('LEAD', 'MEMBER');

-- CreateEnum
CREATE TYPE "AgendaEventType" AS ENUM ('VISIT', 'INSTALLATION', 'MAINTENANCE', 'INSPECTION', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "AgendaEventStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "AgendaEventPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "AgendaAssigneeRole" AS ENUM ('INSTALLER', 'MANAGER', 'VIEWER');

-- CreateTable
CREATE TABLE "Crew" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Crew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewMember" (
    "id" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CrewRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrewMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "AgendaEventType" NOT NULL,
    "status" "AgendaEventStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" "AgendaEventPriority" NOT NULL DEFAULT 'NORMAL',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "notesInternal" TEXT,
    "notesInstaller" TEXT,
    "assigneesCanEdit" BOOLEAN NOT NULL DEFAULT true,
    "lockedByAdmin" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "crewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaAssignment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AgendaAssigneeRole" NOT NULL DEFAULT 'INSTALLER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Crew_ownerId_name_key" ON "Crew"("ownerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CrewMember_crewId_userId_key" ON "CrewMember"("crewId", "userId");

-- CreateIndex
CREATE INDEX "AgendaEvent_ownerId_startAt_idx" ON "AgendaEvent"("ownerId", "startAt");

-- CreateIndex
CREATE INDEX "AgendaEvent_projectId_idx" ON "AgendaEvent"("projectId");

-- CreateIndex
CREATE INDEX "AgendaEvent_crewId_idx" ON "AgendaEvent"("crewId");

-- CreateIndex
CREATE INDEX "AgendaAssignment_userId_idx" ON "AgendaAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaAssignment_eventId_userId_key" ON "AgendaAssignment"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "Crew" ADD CONSTRAINT "Crew_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewMember" ADD CONSTRAINT "CrewMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "Crew"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaAssignment" ADD CONSTRAINT "AgendaAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AgendaEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaAssignment" ADD CONSTRAINT "AgendaAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

