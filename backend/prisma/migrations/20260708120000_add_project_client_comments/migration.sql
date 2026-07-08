-- Comentarios del cliente final sobre el timeline compartido
CREATE TYPE "ClientCommentKind" AS ENUM ('COMMENT', 'PRAISE', 'SUGGESTION', 'QUESTION');

CREATE TABLE "ProjectClientComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "kind" "ClientCommentKind" NOT NULL DEFAULT 'COMMENT',
    "body" TEXT NOT NULL,
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectClientComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectClientComment_projectId_createdAt_idx" ON "ProjectClientComment"("projectId", "createdAt");

ALTER TABLE "ProjectClientComment" ADD CONSTRAINT "ProjectClientComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
