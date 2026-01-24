-- CreateEnum
CREATE TYPE "AgendaReminderStatus" AS ENUM ('PENDING', 'SNOOZED', 'DISMISSED');

-- CreateTable
CREATE TABLE "AgendaReminder" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "remindAt" TIMESTAMP(3) NOT NULL,
    "status" "AgendaReminderStatus" NOT NULL DEFAULT 'PENDING',
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgendaReminder_eventId_userId_key" ON "AgendaReminder"("eventId", "userId");

-- CreateIndex
CREATE INDEX "AgendaReminder_userId_remindAt_idx" ON "AgendaReminder"("userId", "remindAt");

-- CreateIndex
CREATE INDEX "AgendaReminder_eventId_idx" ON "AgendaReminder"("eventId");

-- AddForeignKey
ALTER TABLE "AgendaReminder" ADD CONSTRAINT "AgendaReminder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AgendaEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaReminder" ADD CONSTRAINT "AgendaReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
