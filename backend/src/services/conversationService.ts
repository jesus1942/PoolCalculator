import prisma from '../config/database';

const prismaAny = prisma as any;

type SyncProjectConversationInput = {
  projectId: string;
  organizationId?: string | null;
  createdById?: string | null;
  title?: string | null;
  clientName?: string | null;
  location?: string | null;
};

type SyncAgendaConversationInput = {
  agendaEventId: string;
  projectId?: string | null;
  organizationId?: string | null;
  createdById?: string | null;
  title?: string | null;
  location?: string | null;
  assigneeIds?: string[];
  crewMemberIds?: string[];
};

const toUniqueUserIds = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.filter((value): value is string => Boolean(value))));

export const listConversationSummaries = async (filters: {
  organizationId?: string | null;
  projectId?: string | null;
  agendaEventId?: string | null;
}) => {
  return prismaAny.conversation.findMany({
    where: {
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.agendaEventId ? { agendaEventId: filters.agendaEventId } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      participants: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          senderUser: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });
};

export const syncProjectConversation = async (input: SyncProjectConversationInput) => {
  const existing = await prismaAny.conversation.findFirst({
    where: {
      projectId: input.projectId,
      kind: 'PROJECT',
    },
  });

  const payload = {
    kind: 'PROJECT',
    title: input.title || 'Canal del proyecto',
    topic: input.clientName ? `Cliente: ${input.clientName}` : null,
    visibility: 'INTERNAL',
    organizationId: input.organizationId || null,
    projectId: input.projectId,
    createdById: input.createdById || null,
    metadata: {
      source: 'project',
      clientName: input.clientName || null,
      location: input.location || null,
    },
  };

  const conversation = existing
    ? await prismaAny.conversation.update({
        where: { id: existing.id },
        data: payload,
      })
    : await prismaAny.conversation.create({
        data: payload,
      });

  if (input.createdById) {
    await prismaAny.conversationParticipant.upsert({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: input.createdById,
        },
      },
      create: {
        conversationId: conversation.id,
        userId: input.createdById,
        audience: 'INTERNAL',
        role: 'OWNER',
      },
      update: {
        isActive: true,
        audience: 'INTERNAL',
        role: 'OWNER',
      },
    });
  }

  return conversation;
};

export const syncAgendaConversation = async (input: SyncAgendaConversationInput) => {
  const existing = await prismaAny.conversation.findFirst({
    where: {
      agendaEventId: input.agendaEventId,
      kind: 'AGENDA',
    },
  });

  const payload = {
    kind: 'AGENDA',
    title: input.title || 'Canal del evento',
    topic: input.location || null,
    visibility: 'INTERNAL',
    organizationId: input.organizationId || null,
    projectId: input.projectId || null,
    agendaEventId: input.agendaEventId,
    createdById: input.createdById || null,
    metadata: {
      source: 'agenda',
      location: input.location || null,
    },
  };

  const conversation = existing
    ? await prismaAny.conversation.update({
        where: { id: existing.id },
        data: payload,
      })
    : await prismaAny.conversation.create({
        data: payload,
      });

  const participantIds = toUniqueUserIds([
    input.createdById,
    ...(input.assigneeIds || []),
    ...(input.crewMemberIds || []),
  ]);

  await Promise.all(
    participantIds.map((userId) =>
      prismaAny.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId,
          },
        },
        create: {
          conversationId: conversation.id,
          userId,
          audience: userId === input.createdById ? 'INTERNAL' : 'INSTALLER',
          role: userId === input.createdById ? 'OWNER' : 'MEMBER',
        },
        update: {
          isActive: true,
          audience: userId === input.createdById ? 'INTERNAL' : 'INSTALLER',
          role: userId === input.createdById ? 'OWNER' : 'MEMBER',
        },
      })
    )
  );

  return conversation;
};
