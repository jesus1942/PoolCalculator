import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

type Args = {
  projectId?: string;
  search?: string;
  dryRun: boolean;
};

const parseArgs = (): Args => {
  const args = process.argv.slice(2);
  const parsed: Args = { dryRun: true };

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === '--project-id') parsed.projectId = args[index + 1];
    if (current === '--search') parsed.search = args[index + 1];
    if (current === '--write') parsed.dryRun = false;
  }

  return parsed;
};

const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;

if (!sourceUrl) {
  throw new Error('Falta SOURCE_DATABASE_URL o DATABASE_URL para la base origen');
}

if (!targetUrl) {
  throw new Error('Falta TARGET_DATABASE_URL para la base destino');
}

const source = new PrismaClient({ datasourceUrl: sourceUrl });
const target = new PrismaClient({ datasourceUrl: targetUrl });

const prismaSource: any = source;
const prismaTarget: any = target;

const findProject = async (args: Args) => {
  if (args.projectId) {
    return prismaSource.project.findUnique({
      where: { id: args.projectId },
      include: {
        poolPreset: true,
        projectAdditionals: true,
        projectUpdates: true,
        projectShare: true,
        agendaEvents: {
          include: {
            assignees: true,
            checklist: true,
            reminders: true,
            messages: true,
          },
        },
      },
    });
  }

  if (!args.search) {
    throw new Error('Tenés que pasar --project-id o --search');
  }

  const candidates = await prismaSource.project.findMany({
    where: {
      OR: [
        { name: { contains: args.search, mode: 'insensitive' } },
        { clientName: { contains: args.search, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      poolPreset: true,
      projectAdditionals: true,
      projectUpdates: true,
      projectShare: true,
      agendaEvents: {
        include: {
          assignees: true,
          checklist: true,
          reminders: true,
          messages: true,
        },
      },
    },
  });

  if (candidates.length === 0) return null;
  if (candidates.length > 1) {
    console.log('Se encontraron varios proyectos. Usando el más reciente:');
    candidates.slice(0, 5).forEach((project: any) => {
      console.log(`- ${project.id} | ${project.name} | ${project.clientName} | ${project.createdAt.toISOString()}`);
    });
  }

  return candidates[0];
};

const ensureTargetPoolPreset = async (poolPreset: any) => {
  const exact = await prismaTarget.poolPreset.findUnique({ where: { id: poolPreset.id } });
  if (exact) return exact.id;

  const byShapeAndName = await prismaTarget.poolPreset.findFirst({
    where: {
      name: poolPreset.name,
      length: poolPreset.length,
      width: poolPreset.width,
      depth: poolPreset.depth,
      shape: poolPreset.shape,
    },
  });

  if (!byShapeAndName) {
    throw new Error(`No existe en destino el PoolPreset requerido: ${poolPreset.name}`);
  }

  return byShapeAndName.id;
};

const ensureTargetUserId = async (sourceUserId: string) => {
  const sourceUser = await prismaSource.user.findUnique({ where: { id: sourceUserId } });
  if (!sourceUser) throw new Error(`No existe el usuario origen ${sourceUserId}`);

  const targetUser = await prismaTarget.user.findFirst({
    where: { email: sourceUser.email },
  });

  if (!targetUser) {
    throw new Error(`No existe en destino un usuario con email ${sourceUser.email}`);
  }

  return targetUser.id;
};

const ensureTargetOrgId = async (sourceOrgId?: string | null) => {
  if (!sourceOrgId) return null;

  const sourceOrg = await prismaSource.organization.findUnique({ where: { id: sourceOrgId } });
  if (!sourceOrg) return null;

  const targetOrg = await prismaTarget.organization.findFirst({
    where: {
      OR: [
        ...(sourceOrg.slug ? [{ slug: sourceOrg.slug }] : []),
        { name: sourceOrg.name },
      ],
    },
  });

  if (!targetOrg) {
    throw new Error(`No existe en destino la organización ${sourceOrg.name}`);
  }

  return targetOrg.id;
};

const listConversationsForProject = async (projectId: string, agendaEventIds: string[]) => {
  return prismaSource.conversation.findMany({
    where: {
      OR: [
        { projectId },
        ...(agendaEventIds.length > 0 ? [{ agendaEventId: { in: agendaEventIds } }] : []),
      ],
    },
    include: {
      participants: true,
      messages: true,
    },
  });
};

const run = async () => {
  const args = parseArgs();
  const project = await findProject(args);

  if (!project) {
    throw new Error('No encontré el proyecto en la base origen');
  }

  const targetPoolPresetId = await ensureTargetPoolPreset(project.poolPreset);
  const targetUserId = await ensureTargetUserId(project.userId);
  const targetOrgId = await ensureTargetOrgId(project.organizationId);
  const agendaEventIds = project.agendaEvents.map((event: any) => event.id);
  const conversations = await listConversationsForProject(project.id, agendaEventIds);

  console.log(`Proyecto encontrado: ${project.name} | cliente ${project.clientName}`);
  console.log(`Pool preset destino: ${targetPoolPresetId}`);
  console.log(`Usuario destino: ${targetUserId}`);
  console.log(`Organización destino: ${targetOrgId || 'sin organización'}`);
  console.log(`Relacionados: ${project.projectAdditionals.length} additionals, ${project.projectUpdates.length} updates, ${project.agendaEvents.length} eventos, ${conversations.length} conversaciones`);

  if (args.dryRun) {
    console.log('Dry run activo. No se escribió nada. Usá --write para ejecutar.');
    return;
  }

  const existingProject = await prismaTarget.project.findUnique({ where: { id: project.id } });
  if (existingProject) {
    throw new Error(`Ya existe en destino un proyecto con id ${project.id}`);
  }

  await prismaTarget.$transaction(async (tx: any) => {
    await tx.project.create({
      data: {
        ...project,
        poolPresetId: targetPoolPresetId,
        userId: targetUserId,
        organizationId: targetOrgId,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        poolPreset: undefined,
        projectAdditionals: undefined,
        projectUpdates: undefined,
        projectShare: undefined,
        agendaEvents: undefined,
      },
    });

    for (const additional of project.projectAdditionals) {
      await tx.projectAdditional.create({
        data: {
          ...additional,
          createdAt: additional.createdAt,
          updatedAt: additional.updatedAt,
        },
      });
    }

    for (const update of project.projectUpdates) {
      await tx.projectUpdate.create({
        data: {
          ...update,
          createdAt: update.createdAt,
          updatedAt: update.updatedAt,
        },
      });
    }

    if (project.projectShare) {
      await tx.projectShare.create({
        data: {
          ...project.projectShare,
          createdAt: project.projectShare.createdAt,
          updatedAt: project.projectShare.updatedAt,
        },
      });
    }

    for (const event of project.agendaEvents) {
      const targetEventOwnerId = await ensureTargetUserId(event.ownerId);

      await tx.agendaEvent.create({
        data: {
          ...event,
          ownerId: targetEventOwnerId,
          organizationId: targetOrgId,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
          assignees: undefined,
          checklist: undefined,
          reminders: undefined,
          messages: undefined,
        },
      });

      for (const assignee of event.assignees) {
        await tx.agendaAssignment.create({
          data: {
            ...assignee,
            userId: await ensureTargetUserId(assignee.userId),
            createdAt: assignee.createdAt,
            updatedAt: assignee.updatedAt,
          },
        });
      }

      for (const item of event.checklist) {
        await tx.agendaChecklistItem.create({ data: item });
      }

      for (const reminder of event.reminders) {
        await tx.agendaReminder.create({
          data: {
            ...reminder,
            userId: await ensureTargetUserId(reminder.userId),
            createdAt: reminder.createdAt,
          },
        });
      }

      for (const message of event.messages) {
        await tx.agendaMessage.create({
          data: {
            ...message,
            userId: await ensureTargetUserId(message.userId),
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
          },
        });
      }
    }

    for (const conversation of conversations) {
      await tx.conversation.create({
        data: {
          ...conversation,
          organizationId: targetOrgId,
          createdById: conversation.createdById ? await ensureTargetUserId(conversation.createdById) : null,
          participants: undefined,
          messages: undefined,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      });

      for (const participant of conversation.participants) {
        await tx.conversationParticipant.create({
          data: {
            ...participant,
            userId: participant.userId ? await ensureTargetUserId(participant.userId) : null,
            createdAt: participant.createdAt,
            updatedAt: participant.updatedAt,
          },
        });
      }

      for (const message of conversation.messages) {
        await tx.conversationMessage.create({
          data: {
            ...message,
            senderUserId: message.senderUserId ? await ensureTargetUserId(message.senderUserId) : null,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
          },
        });
      }
    }
  });

  console.log('Proyecto migrado correctamente');
};

run()
  .catch((error) => {
    console.error('Error al migrar proyecto:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
