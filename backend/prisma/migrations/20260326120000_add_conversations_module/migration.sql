CREATE TYPE "ConversationKind" AS ENUM (
  'DIRECT',
  'GROUP',
  'PROJECT',
  'AGENDA',
  'CLIENT_PORTAL',
  'MAINTENANCE',
  'DISPATCH'
);

CREATE TYPE "ConversationVisibility" AS ENUM (
  'INTERNAL',
  'SHARED',
  'CLIENT_PORTAL'
);

CREATE TYPE "ConversationParticipantAudience" AS ENUM (
  'ADMIN',
  'SALES',
  'CLIENT',
  'INSTALLER',
  'MAINTENANCE',
  'INTERNAL'
);

CREATE TYPE "ConversationParticipantRole" AS ENUM (
  'OWNER',
  'MEMBER',
  'OBSERVER'
);

CREATE TYPE "ConversationMessageSenderType" AS ENUM (
  'USER',
  'SYSTEM',
  'EXTERNAL'
);

CREATE TYPE "ConversationMessageVisibility" AS ENUM (
  'ALL',
  'INTERNAL_ONLY',
  'CLIENT_SAFE'
);

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "kind" "ConversationKind" NOT NULL DEFAULT 'GROUP',
  "title" TEXT,
  "topic" TEXT,
  "visibility" "ConversationVisibility" NOT NULL DEFAULT 'INTERNAL',
  "metadata" JSONB,
  "organizationId" TEXT,
  "projectId" TEXT,
  "agendaEventId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationParticipant" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT,
  "audience" "ConversationParticipantAudience" NOT NULL DEFAULT 'INTERNAL',
  "role" "ConversationParticipantRole" NOT NULL DEFAULT 'MEMBER',
  "label" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConversationMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderUserId" TEXT,
  "senderType" "ConversationMessageSenderType" NOT NULL DEFAULT 'USER',
  "body" TEXT NOT NULL,
  "images" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "visibility" "ConversationMessageVisibility" NOT NULL DEFAULT 'ALL',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key"
ON "ConversationParticipant"("conversationId", "userId");

CREATE INDEX "Conversation_organizationId_createdAt_idx"
ON "Conversation"("organizationId", "createdAt");

CREATE INDEX "Conversation_projectId_createdAt_idx"
ON "Conversation"("projectId", "createdAt");

CREATE INDEX "Conversation_agendaEventId_createdAt_idx"
ON "Conversation"("agendaEventId", "createdAt");

CREATE INDEX "ConversationParticipant_conversationId_audience_idx"
ON "ConversationParticipant"("conversationId", "audience");

CREATE INDEX "ConversationParticipant_userId_idx"
ON "ConversationParticipant"("userId");

CREATE INDEX "ConversationMessage_conversationId_createdAt_idx"
ON "ConversationMessage"("conversationId", "createdAt");

CREATE INDEX "ConversationMessage_senderUserId_idx"
ON "ConversationMessage"("senderUserId");

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_agendaEventId_fkey"
FOREIGN KEY ("agendaEventId") REFERENCES "AgendaEvent"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Conversation"
ADD CONSTRAINT "Conversation_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant"
ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant"
ADD CONSTRAINT "ConversationParticipant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationMessage"
ADD CONSTRAINT "ConversationMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationMessage"
ADD CONSTRAINT "ConversationMessage_senderUserId_fkey"
FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
