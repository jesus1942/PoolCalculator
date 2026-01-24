CREATE TABLE "AgendaChecklistItem" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "done" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AgendaChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgendaChecklistItem_eventId_idx" ON "AgendaChecklistItem"("eventId");

ALTER TABLE "AgendaChecklistItem" ADD CONSTRAINT "AgendaChecklistItem_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "AgendaEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
