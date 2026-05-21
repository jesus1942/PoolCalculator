import prisma from '../config/database';
import { sendEmail } from '../utils/mailer';
import { logSystemEvent } from '../utils/systemLog';
import { sendPushNotificationToUser } from './pushNotificationService';

const REMINDER_EMAIL_INTERVAL_MS = Number(process.env.REMINDER_EMAIL_INTERVAL_MS || 5 * 60 * 1000);
const REMINDER_EMAIL_BATCH = Number(process.env.REMINDER_EMAIL_BATCH || 50);
const REMINDER_EMAIL_LOOKBACK_MS = Number(process.env.REMINDER_EMAIL_LOOKBACK_MS || 24 * 60 * 60 * 1000);

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

const buildEmail = (reminder: any) => {
  const event = reminder.event;
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const dateLabel = start.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'short' });
  const startTime = start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const title = event.title || 'Evento';
  const projectLabel = event.project?.name ? `Proyecto: ${event.project.name}` : 'Sin proyecto';
  const locationLabel = event.location ? `Ubicacion: ${event.location}` : 'Sin ubicacion';
  const safeTitle = escapeHtml(title);
  const safeProject = escapeHtml(projectLabel);
  const safeLocation = escapeHtml(locationLabel);

  const subject = `Recordatorio: ${title}`;
  const html = `
    <div style="font-family: Arial, sans-serif; background:#0b0f19; color:#e2e8f0; padding:24px; border-radius:12px;">
      <h2 style="margin:0 0 12px; font-weight:600;">Recordatorio de agenda</h2>
      <p style="margin:0 0 8px;"><strong>${safeTitle}</strong></p>
      <p style="margin:0 0 8px;">${escapeHtml(dateLabel)} · ${escapeHtml(startTime)} - ${escapeHtml(endTime)}</p>
      <p style="margin:0 0 8px;">${safeProject}</p>
      <p style="margin:0 0 16px;">${safeLocation}</p>
      <p style="margin:16px 0 0; color:#94a3b8; font-size:12px;">Ingresar a la agenda para ver mas detalles.</p>
    </div>
  `;

  const text = [
    'Recordatorio de agenda',
    title,
    `${dateLabel} · ${startTime} - ${endTime}`,
    projectLabel,
    locationLabel,
    'Ingresar a la agenda para ver mas detalles.',
  ].join('\n');

  return { subject, html, text };
};

const fetchDueReminders = async () => {
  const now = new Date();
  const lookback = new Date(now.getTime() - REMINDER_EMAIL_LOOKBACK_MS);
  const rows = await prisma.$queryRawUnsafe<Array<any>>(
    `
      SELECT
        ar."id" AS "reminderId",
        ar."remindAt" AS "remindAt",
        ar."emailSentAt" AS "emailSentAt",
        ar."pushSentAt" AS "pushSentAt",
        u."id" AS "userId",
        u."name" AS "userName",
        u."email" AS "userEmail",
        e."id" AS "eventId",
        e."title" AS "eventTitle",
        e."startAt" AS "eventStartAt",
        e."endAt" AS "eventEndAt",
        e."location" AS "eventLocation",
        p."id" AS "projectId",
        p."name" AS "projectName"
      FROM "AgendaReminder" ar
      INNER JOIN "User" u ON u."id" = ar."userId"
      INNER JOIN "AgendaEvent" e ON e."id" = ar."eventId"
      LEFT JOIN "Project" p ON p."id" = e."projectId"
      WHERE ar."status" IN ('PENDING', 'SNOOZED')
        AND ar."remindAt" <= $1
        AND ar."remindAt" >= $2
        AND (ar."snoozedUntil" IS NULL OR ar."snoozedUntil" <= $1)
      ORDER BY ar."remindAt" ASC
      LIMIT $3
    `,
    now,
    lookback,
    REMINDER_EMAIL_BATCH,
  );

  return rows.map((row) => ({
    id: row.reminderId,
    remindAt: row.remindAt,
    emailSentAt: row.emailSentAt,
    pushSentAt: row.pushSentAt,
    user: {
      id: row.userId,
      name: row.userName,
      email: row.userEmail,
    },
    event: {
      id: row.eventId,
      title: row.eventTitle,
      startAt: row.eventStartAt,
      endAt: row.eventEndAt,
      location: row.eventLocation,
      project: row.projectId
        ? {
            id: row.projectId,
            name: row.projectName,
          }
        : null,
    },
  }));
};

const processReminder = async (reminder: any) => {
  const start = new Date(reminder.event.startAt);
  const startLabel = start.toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  let emailSentAt = reminder.emailSentAt;
  let pushSentAt = reminder.pushSentAt;

  if (!reminder.emailSentAt && reminder.user?.email) {
    const { subject, html, text } = buildEmail(reminder);
    const sent = await sendEmail({
      to: [reminder.user.email],
      subject,
      html,
      text,
    });

    await logSystemEvent({
      level: sent ? 'INFO' : 'WARN',
      category: 'AGENDA_REMINDER',
      message: `${sent ? 'Recordatorio enviado por email' : 'Recordatorio no enviado por email'}: ${reminder.event.title || 'Evento'}`,
      meta: {
        reminderId: reminder.id,
        eventId: reminder.event?.id,
        remindAt: reminder.remindAt?.toISOString?.() || null,
      },
      userId: reminder.user.id,
      eventId: reminder.event?.id,
    });

    if (sent) {
      emailSentAt = new Date();
    }
  }

  if (!reminder.pushSentAt) {
    const pushResult = await sendPushNotificationToUser(reminder.user.id, {
      title: 'Recordatorio de agenda',
      body: `${reminder.event.title}\n${startLabel}${reminder.event.location ? `\n${reminder.event.location}` : ''}`,
      url: '/agenda',
      tag: `agenda-reminder-${reminder.id}`,
    });

    if (!pushResult.skipped && pushResult.delivered > 0) {
      pushSentAt = new Date();
    }
  }

  if (!emailSentAt && !pushSentAt) return;

  if (emailSentAt) {
    await prisma.agendaReminder.update({
      where: { id: reminder.id },
      data: { emailSentAt },
    });
  }

  if (pushSentAt) {
    await prisma.$executeRawUnsafe(
      `UPDATE "AgendaReminder" SET "pushSentAt" = $2 WHERE "id" = $1`,
      reminder.id,
      pushSentAt,
    );
  }
};

export const startAgendaReminderEmailService = () => {
  const tick = async () => {
    try {
      const reminders = await fetchDueReminders();
      for (const reminder of reminders) {
        await processReminder(reminder);
      }
    } catch (error) {
      console.error('[AGENDA-EMAIL] Error procesando recordatorios:', error);
      await logSystemEvent({
        level: 'ERROR',
        category: 'AGENDA_REMINDER',
        message: 'Error procesando recordatorios por email',
        meta: { error: String(error) },
      });
    }
  };

  void tick();
  setInterval(tick, REMINDER_EMAIL_INTERVAL_MS);
};
