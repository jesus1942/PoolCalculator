import { Response } from 'express';
import prisma from '../config/database';
import { sendEmail } from '../utils/mailer';
import { logSystemEvent } from '../utils/systemLog';
import { AuthRequest } from '../middleware/auth';
import { storeImageFile } from '../utils/imageStorage';

const isAdminRole = (role?: string) => role === 'ADMIN' || role === 'SUPERADMIN';

const TYPE_COLORS: Record<string, string> = {
  VISIT: '#0ea5e9',
  INSTALLATION: '#22c55e',
  MAINTENANCE: '#f97316',
  INSPECTION: '#a855f7',
  DELIVERY: '#eab308',
  OTHER: '#64748b',
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: '#94a3b8',
  CONFIRMED: '#0ea5e9',
  IN_PROGRESS: '#f97316',
  DONE: '#22c55e',
  CANCELED: '#ef4444',
};

const getTypeColor = (type?: string) => TYPE_COLORS[type || 'OTHER'] || TYPE_COLORS.OTHER;
const getStatusColor = (status?: string) => STATUS_COLORS[status || 'PLANNED'] || STATUS_COLORS.PLANNED;
const REMINDER_OFFSET_MS = 12 * 60 * 60 * 1000;
const ADMIN_ORG_ROLES = ['OWNER', 'ADMIN'];
const ADMIN_USER_ROLES = ['ADMIN', 'SUPERADMIN'];

const getAdminUsersForOrg = async (orgId?: string | null) => {
  if (orgId) {
    const members = await prisma.organizationMember.findMany({
      where: {
        organizationId: orgId,
        role: { in: ADMIN_ORG_ROLES as any },
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    return members.map((member) => member.user).filter(Boolean);
  }

  return prisma.user.findMany({
    where: { role: { in: ADMIN_USER_ROLES as any } },
    select: { id: true, name: true, email: true, role: true },
  });
};

const formatEventWindow = (event: any) => {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const date = start.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' });
  const startTime = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${startTime}-${endTime}`;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char] || char;
  });

const sendReminderStatusEmail = async (reminderId: string, status: 'SNOOZED' | 'DISMISSED', snoozedUntil?: Date | null) => {
  try {
    const reminder = await prisma.agendaReminder.findUnique({
      where: { id: reminderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            endAt: true,
            location: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!reminder?.user?.email || !reminder.event) return;

    const windowLabel = formatEventWindow(reminder.event);
    const title = reminder.event.title || 'Evento';
    const projectLabel = reminder.event.project?.name ? `Proyecto: ${reminder.event.project.name}` : 'Sin proyecto';
    const locationLabel = reminder.event.location ? `Ubicacion: ${reminder.event.location}` : 'Sin ubicacion';
    const statusLabel = status === 'SNOOZED' ? 'Recordatorio pospuesto' : 'Recordatorio descartado';
    const snoozeLabel = snoozedUntil
      ? `Nuevo aviso: ${snoozedUntil.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; background:#0b0f19; color:#e2e8f0; padding:24px; border-radius:12px;">
        <h2 style="margin:0 0 12px; font-weight:600;">${escapeHtml(statusLabel)}</h2>
        <p style="margin:0 0 8px;"><strong>${escapeHtml(title)}</strong> · ${escapeHtml(windowLabel)}</p>
        <p style="margin:0 0 8px;">${escapeHtml(projectLabel)}</p>
        <p style="margin:0 0 8px;">${escapeHtml(locationLabel)}</p>
        ${snoozeLabel ? `<p style="margin:12px 0 0; color:#94a3b8; font-size:12px;">${escapeHtml(snoozeLabel)}</p>` : ''}
      </div>
    `;

    const text = [
      statusLabel,
      `${title} · ${windowLabel}`,
      projectLabel,
      locationLabel,
      snoozeLabel,
    ].filter(Boolean).join('\n');

    await sendEmail({
      to: [reminder.user.email],
      subject: `${statusLabel}: ${title}`,
      html,
      text,
    });

    await logSystemEvent({
      level: 'INFO',
      category: 'AGENDA_REMINDER',
      message: `${statusLabel}: ${title}`,
      meta: {
        status,
        eventId: reminder.event.id,
        snoozedUntil: snoozedUntil ? snoozedUntil.toISOString() : null,
      },
      userId: reminder.user.id,
      eventId: reminder.event.id,
    });
  } catch (error) {
    console.error('[AGENDA] Error al enviar email de recordatorio:', error);
    await logSystemEvent({
      level: 'ERROR',
      category: 'AGENDA_REMINDER',
      message: 'Error al enviar email de recordatorio',
      meta: { error: String(error), status },
      eventId: reminderId,
    });
  }
};

const sendAgendaNotification = async (payload: {
  eventId: string;
  kind: 'CREATED' | 'UPDATED' | 'DELETED' | 'MESSAGE';
  actorId?: string;
  messageBody?: string;
  visibility?: 'ALL' | 'ADMIN_ONLY';
}) => {
  try {
    const event = await prisma.agendaEvent.findUnique({
      where: { id: payload.eventId },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        crew: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        project: { select: { id: true, name: true, clientName: true, location: true } },
      },
    });

    if (!event) return;

    const recipients = new Map<string, { id: string; name: string | null; email: string | null }>();
    const addRecipient = (user?: { id: string; name?: string | null; email?: string | null }) => {
      if (!user?.email) return;
      if (payload.actorId && user.id === payload.actorId) return;
      recipients.set(user.id, { id: user.id, name: user.name ?? null, email: user.email });
    };

    const admins = await getAdminUsersForOrg(event.organizationId || undefined);

    if (payload.visibility === 'ADMIN_ONLY') {
      admins.forEach(addRecipient);
    } else {
      const owner = await prisma.user.findUnique({
        where: { id: event.ownerId },
        select: { id: true, name: true, email: true },
      });
      addRecipient(owner || undefined);
      event.assignees.forEach((assignee) => addRecipient(assignee.user));
      event.crew?.members?.forEach((member) => addRecipient(member.user));
      admins.forEach(addRecipient);
    }

    if (recipients.size === 0) return;

    const windowLabel = formatEventWindow(event);
    const title = event.title || 'Evento';
    const projectLabel = event.project?.name ? `Proyecto: ${event.project.name}` : 'Sin proyecto';
    const locationLabel = event.location ? `Ubicacion: ${event.location}` : 'Sin ubicacion';
    const safeTitle = escapeHtml(title);
    const safeProjectLabel = escapeHtml(projectLabel);
    const safeLocationLabel = escapeHtml(locationLabel);

    let subject = `Agenda: ${title}`;
    let header = 'Actualizacion de agenda';
    if (payload.kind === 'CREATED') header = 'Nuevo evento en agenda';
    if (payload.kind === 'UPDATED') header = 'Evento actualizado';
    if (payload.kind === 'DELETED') header = 'Evento cancelado';
    if (payload.kind === 'MESSAGE') header = 'Nuevo mensaje en evento';

    if (payload.kind === 'MESSAGE') {
      subject = `Agenda: mensaje en ${title}`;
    }

    const messageBlock = payload.messageBody
      ? `<p style="margin:12px 0; padding:10px; background:#0f172a; border-radius:8px; color:#e2e8f0;">${escapeHtml(payload.messageBody)}</p>`
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; background:#0b0f19; color:#e2e8f0; padding:24px; border-radius:12px;">
        <h2 style="margin:0 0 12px; font-weight:600;">${header}</h2>
        <p style="margin:0 0 8px;"><strong>${safeTitle}</strong> · ${escapeHtml(windowLabel)}</p>
        <p style="margin:0 0 8px;">${safeProjectLabel}</p>
        <p style="margin:0 0 16px;">${safeLocationLabel}</p>
        ${messageBlock}
        <p style="margin:16px 0 0; color:#94a3b8; font-size:12px;">Ingresar a la agenda para ver mas detalles.</p>
      </div>
    `;

    const textLines = [
      header,
      `${title} · ${windowLabel}`,
      projectLabel,
      locationLabel,
      payload.messageBody ? `Mensaje: ${payload.messageBody}` : '',
      'Ingresar a la agenda para ver mas detalles.',
    ].filter(Boolean);

    const sent = await sendEmail({
      to: Array.from(recipients.values()).map((user) => user.email as string),
      subject,
      html,
      text: textLines.join('\n'),
    });

    await logSystemEvent({
      level: sent ? 'INFO' : 'WARN',
      category: 'AGENDA_NOTIFY',
      message: `${header}: ${title}`,
      meta: {
        kind: payload.kind,
        visibility: payload.visibility || 'ALL',
        recipients: recipients.size,
      },
      userId: payload.actorId || undefined,
      eventId: payload.eventId,
    });
  } catch (error) {
    console.error('[AGENDA] Error al enviar notificacion:', error);
    await logSystemEvent({
      level: 'ERROR',
      category: 'AGENDA_NOTIFY',
      message: 'Error al enviar notificacion de agenda',
      meta: { error: String(error), kind: payload.kind },
      userId: payload.actorId || undefined,
      eventId: payload.eventId,
    });
  }
};

const canEditAsAssignee = (event: any, userId: string) => {
  if (!event.assigneesCanEdit || event.lockedByAdmin) return false;
  const isAssignee = event.assignees?.some((a: any) => a.userId === userId);
  const isCrewMember = event.crew?.members?.some((m: any) => m.userId === userId);
  return isAssignee || isCrewMember;
};

const canMessageEvent = (event: any, userId: string, role?: string) => {
  const isOwner = event.ownerId === userId;
  const isAdmin = isAdminRole(role) && isOwner;
  const isAssignee = event.assignees?.some((a: any) => a.userId === userId);
  const isCrewMember = event.crew?.members?.some((m: any) => m.userId === userId);
  return isOwner || isAdmin || isAssignee || isCrewMember;
};

const ASSIGNEE_ALLOWED_STATUSES = new Set(['PLANNED', 'CONFIRMED', 'IN_PROGRESS', 'DONE']);

const pickAssigneeFields = (payload: any) => {
  const status = payload.status;
  if (status && !ASSIGNEE_ALLOWED_STATUSES.has(status)) {
    return { status: undefined, notesInstaller: payload.notesInstaller, invalidStatus: true };
  }
  return { status, notesInstaller: payload.notesInstaller, invalidStatus: false };
};

const syncAgendaReminders = async (eventId: string) => {
  const event = await prisma.agendaEvent.findUnique({
    where: { id: eventId },
    include: {
      assignees: true,
      crew: { include: { members: true } },
    },
  });

  if (!event) return;

  const remindAt = new Date(event.startAt.getTime() - REMINDER_OFFSET_MS);
  const userIds = new Set<string>([event.ownerId]);
  event.assignees.forEach((assignee) => userIds.add(assignee.userId));
  event.crew?.members?.forEach((member) => userIds.add(member.userId));
  const adminUsers = await getAdminUsersForOrg(event.organizationId || undefined);
  adminUsers.forEach((admin) => userIds.add(admin.id));

  await prisma.agendaReminder.deleteMany({ where: { eventId } });

  if (userIds.size === 0) return;

  await prisma.agendaReminder.createMany({
    data: Array.from(userIds).map((userId) => ({
      eventId,
      userId,
      remindAt,
    })),
    skipDuplicates: true,
  });
};

export const listAgendaEvents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const {
      start,
      end,
      projectId,
      crewId,
      assigneeId,
      status,
      priority,
      type,
    } = req.query;

    const filters: any = {};
    if (start || end) {
      filters.startAt = {};
      if (start) filters.startAt.gte = new Date(String(start));
      if (end) filters.startAt.lte = new Date(String(end));
    }
    if (projectId) filters.projectId = String(projectId);
    if (crewId) filters.crewId = String(crewId);
    if (status) filters.status = String(status);
    if (priority) filters.priority = String(priority);
    if (type) filters.type = String(type);

    let where: any = { ...filters, ...(orgId ? { organizationId: orgId } : {}) };
    if (isAdminRole(role)) {
      if (!orgId) {
        where.ownerId = userId;
      }
    } else {
      const assigneeFilter = userId;
      where.OR = [
        { assignees: { some: { userId: assigneeFilter } } },
        { crew: { members: { some: { userId: assigneeFilter } } } },
      ];
    }

    const events = await prisma.agendaEvent.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        crew: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        project: { select: { id: true, name: true, clientName: true, location: true } },
        checklist: true,
      },
    });

    res.json(events);
  } catch (error) {
    console.error('Error al listar agenda:', error);
    res.status(500).json({ error: 'Error al listar agenda' });
  }
};

export const getAgendaEventById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        crew: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        project: { select: { id: true, name: true, clientName: true, location: true } },
        checklist: true,
      },
    });

    if (!event || (orgId && event.organizationId && event.organizationId !== orgId)) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const isOwner = event.ownerId === userId;
    const isAssignee = event.assignees?.some((a: any) => a.userId === userId);
    const isCrewMember = event.crew?.members?.some((m: any) => m.userId === userId);

    if (!isOwner && !isAdminRole(role) && !isAssignee && !isCrewMember) {
      return res.status(403).json({ error: 'No tenés permiso para ver este evento' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error al obtener evento:', error);
    res.status(500).json({ error: 'Error al obtener evento' });
  }
};

export const createAgendaEvent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!isAdminRole(role)) {
      return res.status(403).json({ error: 'Se requiere rol de administrador' });
    }

    const {
      title,
      type,
      status,
      priority,
      startAt,
      endAt,
      allDay,
      location,
      notesInternal,
      notesInstaller,
      assigneesCanEdit,
      lockedByAdmin,
      projectId,
      crewId,
      assigneeIds,
    } = req.body;

    const event = await prisma.agendaEvent.create({
      data: {
        title,
        type,
        status,
        priority,
        typeColor: getTypeColor(type),
        statusColor: getStatusColor(status),
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        allDay: Boolean(allDay),
        location,
        notesInternal,
        notesInstaller,
        assigneesCanEdit: assigneesCanEdit ?? true,
        lockedByAdmin: lockedByAdmin ?? false,
        ownerId: userId,
        projectId: projectId || null,
        crewId: crewId || null,
        organizationId: orgId,
      },
    });

    if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      await prisma.agendaAssignment.createMany({
        data: assigneeIds.map((assigneeId: string) => ({
          eventId: event.id,
          userId: assigneeId,
        })),
        skipDuplicates: true,
      });
    }

    await syncAgendaReminders(event.id);
    void sendAgendaNotification({
      eventId: event.id,
      kind: 'CREATED',
      actorId: userId || undefined,
    });

    const fullEvent = await prisma.agendaEvent.findUnique({
      where: { id: event.id },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        crew: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        project: { select: { id: true, name: true, clientName: true, location: true } },
        checklist: true,
      },
    });

    res.status(201).json(fullEvent);
  } catch (error) {
    console.error('Error al crear evento:', error);
    res.status(500).json({ error: 'Error al crear evento' });
  }
};

export const updateAgendaEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
      include: {
        assignees: true,
        crew: { include: { members: true } },
      },
    });

    if (!event || (orgId && event.organizationId && event.organizationId !== orgId)) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    const isOwner = event.ownerId === userId;
    const isAdmin = isAdminRole(role) && isOwner;
    const canEdit = isOwner || isAdmin || canEditAsAssignee(event, userId);

    if (!canEdit) {
      return res.status(403).json({ error: 'No tenés permiso para editar este evento' });
    }

    let data: any = {};
    if (isOwner || isAdmin) {
      const {
        title,
        type,
        status,
        priority,
        startAt,
        endAt,
        allDay,
        location,
        notesInternal,
        notesInstaller,
        assigneesCanEdit,
        lockedByAdmin,
        projectId,
        crewId,
        assigneeIds,
      } = req.body;

      data = {
        title,
        type,
        status,
        priority,
        typeColor: type ? getTypeColor(type) : undefined,
        statusColor: status ? getStatusColor(status) : undefined,
        startAt: startAt ? new Date(startAt) : undefined,
        endAt: endAt ? new Date(endAt) : undefined,
        allDay,
        location,
        notesInternal,
        notesInstaller,
        assigneesCanEdit,
        lockedByAdmin,
        projectId: projectId === undefined ? undefined : projectId,
        crewId: crewId === undefined ? undefined : crewId,
      };

      if (Array.isArray(assigneeIds)) {
        await prisma.agendaAssignment.deleteMany({ where: { eventId: id } });
        if (assigneeIds.length > 0) {
          await prisma.agendaAssignment.createMany({
            data: assigneeIds.map((assigneeId: string) => ({
              eventId: id,
              userId: assigneeId,
            })),
            skipDuplicates: true,
          });
        }
      }
    } else {
      const limited = pickAssigneeFields(req.body);
      if (limited.invalidStatus) {
        return res.status(403).json({ error: 'No tenés permiso para asignar ese estado' });
      }
      data = {
        status: limited.status,
        notesInstaller: limited.notesInstaller,
      };
    }

    const updated = await prisma.agendaEvent.update({
      where: { id },
      data,
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
        crew: { include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } } },
        project: { select: { id: true, name: true, clientName: true, location: true } },
        checklist: true,
      },
    });

    if (isOwner || isAdmin) {
      await syncAgendaReminders(id);
    }

    void sendAgendaNotification({
      eventId: id,
      kind: 'UPDATED',
      actorId: userId || undefined,
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar evento:', error);
    res.status(500).json({ error: 'Error al actualizar evento' });
  }
};

export const deleteAgendaEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!isAdminRole(role)) return res.status(403).json({ error: 'Se requiere rol de administrador' });

    const event = await prisma.agendaEvent.findUnique({ where: { id } });
    if (!event || (orgId && event.organizationId && event.organizationId !== orgId)) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }
    if (event.ownerId !== userId) {
      return res.status(403).json({ error: 'No tenés permiso para eliminar este evento' });
    }

    void sendAgendaNotification({
      eventId: id,
      kind: 'DELETED',
      actorId: userId || undefined,
    });

    await prisma.agendaEvent.delete({ where: { id } });
    res.json({ message: 'Evento eliminado' });
  } catch (error) {
    console.error('Error al eliminar evento:', error);
    res.status(500).json({ error: 'Error al eliminar evento' });
  }
};

export const listAgendaChecklist = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
      include: {
        assignees: true,
        crew: { include: { members: true } },
        checklist: true,
      },
    });

    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const isOwner = event.ownerId === userId;
    const isAssignee = event.assignees?.some((a: any) => a.userId === userId);
    const isCrewMember = event.crew?.members?.some((m: any) => m.userId === userId);
    if (!isOwner && !isAssignee && !isCrewMember) {
      return res.status(403).json({ error: 'No tenés permiso para ver este checklist' });
    }

    res.json(event.checklist || []);
  } catch (error) {
    console.error('Error al listar checklist:', error);
    res.status(500).json({ error: 'Error al listar checklist' });
  }
};

export const addAgendaChecklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { label } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
      include: {
        assignees: true,
        crew: { include: { members: true } },
      },
    });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const isOwner = event.ownerId === userId;
    const isAdmin = isAdminRole(role) && isOwner;
    const canEdit = isOwner || isAdmin || canEditAsAssignee(event, userId);
    if (!canEdit) {
      return res.status(403).json({ error: 'No tenés permiso para editar este evento' });
    }

    const item = await prisma.agendaChecklistItem.create({
      data: { eventId: id, label },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error al agregar checklist:', error);
    res.status(500).json({ error: 'Error al agregar checklist' });
  }
};

export const updateAgendaChecklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id, itemId } = req.params;
    const { label, done } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
      include: {
        assignees: true,
        crew: { include: { members: true } },
      },
    });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const isOwner = event.ownerId === userId;
    const isAdmin = isAdminRole(role) && isOwner;
    const canEdit = isOwner || isAdmin || canEditAsAssignee(event, userId);
    if (!canEdit) {
      return res.status(403).json({ error: 'No tenés permiso para editar este evento' });
    }

    const updated = await prisma.agendaChecklistItem.update({
      where: { id: itemId },
      data: {
        label: label !== undefined ? label : undefined,
        done: done !== undefined ? Boolean(done) : undefined,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar checklist:', error);
    res.status(500).json({ error: 'Error al actualizar checklist' });
  }
};

export const deleteAgendaChecklistItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id, itemId } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
      include: {
        assignees: true,
        crew: { include: { members: true } },
      },
    });
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    const isOwner = event.ownerId === userId;
    const isAdmin = isAdminRole(role) && isOwner;
    const canEdit = isOwner || isAdmin || canEditAsAssignee(event, userId);
    if (!canEdit) {
      return res.status(403).json({ error: 'No tenés permiso para editar este evento' });
    }

    await prisma.agendaChecklistItem.delete({ where: { id: itemId } });
    res.json({ message: 'Checklist eliminado' });
  } catch (error) {
    console.error('Error al eliminar checklist:', error);
    res.status(500).json({ error: 'Error al eliminar checklist' });
  }
};

export const listAgendaMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
      include: {
        assignees: true,
        crew: { include: { members: true } },
      },
    });
    if (!event || (orgId && event.organizationId && event.organizationId !== orgId)) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    if (!canMessageEvent(event, userId, role)) {
      return res.status(403).json({ error: 'No tenés permiso para ver este evento' });
    }

    const isOwner = event.ownerId === userId;
    const isAdmin = isAdminRole(role) && isOwner;

    const messages = await prisma.agendaMessage.findMany({
      where: {
        eventId: id,
        ...(isOwner || isAdmin ? {} : { visibility: 'ALL' }),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error al listar mensajes:', error);
    res.status(500).json({ error: 'Error al listar mensajes' });
  }
};

export const addAgendaMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { body, visibility } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    const files = (req.files as Express.Multer.File[]) || [];
    if (!body?.trim() && files.length === 0) {
      return res.status(400).json({ error: 'Mensaje vacío' });
    }

    const event = await prisma.agendaEvent.findUnique({
      where: { id },
      include: {
        assignees: true,
        crew: { include: { members: true } },
      },
    });
    if (!event || (orgId && event.organizationId && event.organizationId !== orgId)) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    if (!canMessageEvent(event, userId, role)) {
      return res.status(403).json({ error: 'No tenés permiso para este evento' });
    }

    const isOwner = event.ownerId === userId;
    const isAdmin = isAdminRole(role) && isOwner;
    const nextVisibility = (isOwner || isAdmin) ? (visibility || 'ALL') : 'ALL';

    const imageUrls = await Promise.all(
      files.map((file) =>
        storeImageFile(file, {
          folder: 'agenda',
          localDir: 'agenda',
          filenamePrefix: 'agenda',
        })
      )
    );

    const message = await prisma.agendaMessage.create({
      data: {
        eventId: id,
        userId,
        body: body?.trim() || '',
        visibility: nextVisibility,
        images: imageUrls,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    void sendAgendaNotification({
      eventId: id,
      kind: 'MESSAGE',
      actorId: userId || undefined,
      messageBody: body?.trim() || undefined,
      visibility: nextVisibility,
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error al crear mensaje:', error);
    res.status(500).json({ error: 'Error al crear mensaje' });
  }
};

export const listAgendaReminders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const now = new Date();
    const reminders = await prisma.agendaReminder.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'SNOOZED'] },
        remindAt: { lte: now },
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
      },
      orderBy: { remindAt: 'asc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            typeColor: true,
            statusColor: true,
            startAt: true,
            endAt: true,
            location: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.json(reminders);
  } catch (error) {
    console.error('Error al listar recordatorios:', error);
    res.status(500).json({ error: 'Error al listar recordatorios' });
  }
};

export const snoozeAgendaReminder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { minutes } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const reminder = await prisma.agendaReminder.findUnique({ where: { id } });
    if (!reminder) return res.status(404).json({ error: 'Recordatorio no encontrado' });
    if (reminder.userId !== userId) {
      return res.status(403).json({ error: 'No tenés permiso para modificar este recordatorio' });
    }

    const snoozeMinutes = Number(minutes) || 60;
    const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    const updated = await prisma.agendaReminder.update({
      where: { id },
      data: {
        status: 'SNOOZED',
        snoozedUntil,
      },
    });

    void sendReminderStatusEmail(updated.id, 'SNOOZED', snoozedUntil);

    res.json(updated);
  } catch (error) {
    console.error('Error al posponer recordatorio:', error);
    res.status(500).json({ error: 'Error al posponer recordatorio' });
  }
};

export const dismissAgendaReminder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const reminder = await prisma.agendaReminder.findUnique({ where: { id } });
    if (!reminder) return res.status(404).json({ error: 'Recordatorio no encontrado' });
    if (reminder.userId !== userId) {
      return res.status(403).json({ error: 'No tenés permiso para modificar este recordatorio' });
    }

    const updated = await prisma.agendaReminder.update({
      where: { id },
      data: {
        status: 'DISMISSED',
      },
    });

    void sendReminderStatusEmail(updated.id, 'DISMISSED');

    res.json(updated);
  } catch (error) {
    console.error('Error al descartar recordatorio:', error);
    res.status(500).json({ error: 'Error al descartar recordatorio' });
  }
};
