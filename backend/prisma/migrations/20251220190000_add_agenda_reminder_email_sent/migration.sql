-- AlterTable
ALTER TABLE "AgendaReminder" ADD COLUMN "emailSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AgendaReminder_emailSentAt_remindAt_idx" ON "AgendaReminder"("emailSentAt", "remindAt");
