-- CreateEnum
CREATE TYPE "AgendaMessageVisibility" AS ENUM ('ALL', 'ADMIN_ONLY');

-- CreateTable
CREATE TABLE "AgendaMessage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "AgendaMessageVisibility" NOT NULL DEFAULT 'ALL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgendaMessage_eventId_idx" ON "AgendaMessage"("eventId");

-- CreateIndex
CREATE INDEX "AgendaMessage_userId_idx" ON "AgendaMessage"("userId");

-- AddForeignKey
ALTER TABLE "AgendaMessage" ADD CONSTRAINT "AgendaMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AgendaEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaMessage" ADD CONSTRAINT "AgendaMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
