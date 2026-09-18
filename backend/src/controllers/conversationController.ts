import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { listConversationSummaries, syncAgendaConversation, syncProjectConversation } from '../services/conversationService';
import { storeImageFile } from '../utils/imageStorage';
import { canAccessConversation, canManageConversation, sanitizeConversation } from '../utils/conversationAccess';
import { belongsToOrganization, normalizeMemberIds, usersBelongToOrganization } from '../utils/tenantRelations';
import { resolveProjectAccessProfile } from '../utils/projectAccess';

const prismaAny = prisma as any;

const isAdminRole = (role?: string) => role === 'ADMIN' || role === 'SUPERADMIN';

const getConversationScoped = async (conversationId: string, orgId?: string | null) =>
  prismaAny.conversation.findFirst({
    where: {
      id: conversationId,
      ...(orgId ? { organizationId: orgId } : {}),
    },
    include: {
      participants: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      project: { select: { id: true, name: true, clientName: true, location: true } },
      agendaEvent: { select: { id: true, title: true, startAt: true, endAt: true, location: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          senderUser: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });


const canCreateConversation = (role?: string) => role !== 'INSTALLER' && role !== 'VIEWER';

export const listConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : null;
    const agendaEventId = typeof req.query.agendaEventId === 'string' ? req.query.agendaEventId : null;
    const kind = typeof req.query.kind === 'string' ? req.query.kind : null;

    // Siempre se lista dentro de la empresa activa y se comprueba la participación.
    const conversations = await listConversationSummaries({
      organizationId: orgId,
      projectId,
      agendaEventId,
    });

    const filtered = conversations.filter((conversation: any) => {
      if (kind && conversation.kind !== kind) return false;
      return canAccessConversation(conversation, req.user || {});
    });

    res.json(filtered.map((conversation: any) => sanitizeConversation(conversation, req.user || {})));
  } catch (error) {
    console.error('Error al listar conversaciones:', error);
    res.status(500).json({ error: 'Error al listar conversaciones' });
  }
};

export const getConversationById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const conversation = await getConversationScoped(req.params.id, orgId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    if (!canAccessConversation(conversation, req.user || {})) {
      return res.status(403).json({ error: 'No tenés permiso para ver esta conversación' });
    }

    res.json(sanitizeConversation(conversation, req.user || {}));
  } catch (error) {
    console.error('Error al obtener conversación:', error);
    res.status(500).json({ error: 'Error al obtener conversación' });
  }
};

export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!canCreateConversation(role)) {
      return res.status(403).json({ error: 'No tenés permiso para crear conversaciones' });
    }

    const {
      kind,
      title,
      topic,
      visibility,
      projectId,
      agendaEventId,
      participantUserIds = [],
    } = req.body || {};

    const requestedParticipants = normalizeMemberIds(participantUserIds);
    if (!requestedParticipants) return res.status(400).json({ error: 'Participantes inválidos' });
    const participantIds = [...new Set([userId, ...requestedParticipants])];
    if (!await usersBelongToOrganization(participantIds, orgId)) {
      return res.status(400).json({ error: 'Todos los participantes deben pertenecer a esta organización' });
    }

    if (agendaEventId) {
      const event = await prisma.agendaEvent.findFirst({
        where: { id: agendaEventId, ...(orgId ? { organizationId: orgId } : {}) },
        include: {
          crew: { include: { members: { select: { userId: true } } } },
          assignees: { select: { userId: true } },
        },
      });

      if (!event) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      if (event.ownerId !== userId && !(isAdminRole(role) && belongsToOrganization(event.organizationId, orgId))) {
        return res.status(403).json({ error: 'No tenés permiso para administrar el canal de este evento' });
      }
      if (projectId && projectId !== event.projectId) {
        return res.status(400).json({ error: 'El proyecto no corresponde al evento' });
      }

      const conversation = await syncAgendaConversation({
        agendaEventId: event.id,
        projectId: event.projectId || null,
        organizationId: event.organizationId || orgId,
        createdById: event.ownerId,
        title: title || event.title,
        location: event.location || topic || null,
        assigneeIds: Array.from(new Set([
          ...event.assignees.map((assignee: any) => assignee.userId),
          ...participantIds,
        ])),
        crewMemberIds: event.crew?.members?.map((member: any) => member.userId) || [],
      });

      const fullConversation = await getConversationScoped(conversation.id, orgId);
      return res.status(201).json(fullConversation);
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, ...(orgId ? { organizationId: orgId } : {}) },
      });

      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      const access = await resolveProjectAccessProfile(project, req.user || {});
      if (!access.canEdit) return res.status(403).json({ error: 'No tenés permiso para administrar el canal de este proyecto' });

      const conversation = await syncProjectConversation({
        projectId: project.id,
        organizationId: project.organizationId || orgId,
        createdById: project.userId,
        title: title || project.name,
        clientName: project.clientName,
        location: project.location || null,
        kind: kind || 'PROJECT',
        visibility: visibility || 'INTERNAL',
      });

      await Promise.all(
        participantIds.map((participantId: string) =>
          prismaAny.conversationParticipant.upsert({
            where: {
              conversationId_userId: {
                conversationId: conversation.id,
                userId: participantId,
              },
            },
            create: {
              conversationId: conversation.id,
              userId: participantId,
              audience: participantId === userId ? 'SALES' : 'INTERNAL',
              role: participantId === userId ? 'OWNER' : 'MEMBER',
            },
            update: {
              isActive: true,
            },
          })
        )
      );

      const fullConversation = await getConversationScoped(conversation.id, orgId);
      return res.status(201).json(fullConversation);
    }

    const conversation = await prismaAny.conversation.create({
      data: {
        kind: kind || 'GROUP',
        title: title?.trim() || null,
        topic: topic?.trim() || null,
        visibility: visibility || 'INTERNAL',
        organizationId: orgId,
        createdById: userId,
      },
    });

    await Promise.all(
      participantIds.map((participantId: string) =>
        prismaAny.conversationParticipant.upsert({
          where: {
            conversationId_userId: {
              conversationId: conversation.id,
              userId: participantId,
            },
          },
          create: {
            conversationId: conversation.id,
            userId: participantId,
            audience: participantId === userId ? 'SALES' : 'INTERNAL',
            role: participantId === userId ? 'OWNER' : 'MEMBER',
          },
          update: {
            isActive: true,
          },
        })
      )
    );

    const fullConversation = await getConversationScoped(conversation.id, orgId);
    res.status(201).json(fullConversation);
  } catch (error) {
    console.error('Error al crear conversación:', error);
    res.status(500).json({ error: 'Error al crear conversación' });
  }
};

export const listConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const conversation = await getConversationScoped(req.params.id, orgId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    if (!canAccessConversation(conversation, req.user || {})) {
      return res.status(403).json({ error: 'No tenés permiso para ver los mensajes de esta conversación' });
    }

    const isConversationAdmin = canManageConversation(conversation, req.user || {});
    const messages = await prismaAny.conversationMessage.findMany({
      where: {
        conversationId: conversation.id,
        ...(isConversationAdmin ? {} : { visibility: { not: 'INTERNAL_ONLY' } }),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        senderUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error al listar mensajes de conversación:', error);
    res.status(500).json({ error: 'Error al listar mensajes de conversación' });
  }
};

export const addConversationMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const { body, visibility, metadata } = req.body || {};
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];

    if (!body?.trim() && uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }


    const conversation = await getConversationScoped(req.params.id, orgId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversación no encontrada' });
    }

    if (!canAccessConversation(conversation, req.user || {})) {
      return res.status(403).json({ error: 'No tenés permiso para escribir en esta conversación' });
    }

    const uploadedUrls = await Promise.all(
      uploadedFiles.map(file =>
        storeImageFile(file, { folder: 'chat', localDir: 'chat', filenamePrefix: 'chat' })
      )
    );

    const isConversationAdmin = canManageConversation(conversation, req.user || {});
    const message = await prismaAny.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        senderUserId: userId,
        senderType: 'USER',
        body: body?.trim() || '',
        images: uploadedUrls,
        visibility: isConversationAdmin ? (visibility || 'ALL') : 'ALL',
        metadata: metadata || undefined,
      },
      include: {
        senderUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error al crear mensaje de conversación:', error);
    res.status(500).json({ error: 'Error al crear mensaje de conversación' });
  }
};
