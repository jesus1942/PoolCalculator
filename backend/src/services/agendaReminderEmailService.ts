import prisma from '../config/database';
import { sendEmail } from '../utils/mailer';
import { logSystemEvent } from '../utils/systemLog';

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
  return prisma.agendaReminder.findMany({
    where: {
      emailSentAt: null,
      status: { in: ['PENDING', 'SNOOZED'] },
      remindAt: { lte: now, gte: lookback },
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
    orderBy: { remindAt: 'asc' },
    take: REMINDER_EMAIL_BATCH,
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
};

const processReminder = async (reminder: any) => {
  if (!reminder.user?.email) return;

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
    message: `${sent ? 'Recordatorio enviado' : 'Recordatorio no enviado'}: ${reminder.event.title || 'Evento'}`,
    meta: {
      reminderId: reminder.id,
      eventId: reminder.event?.id,
      remindAt: reminder.remindAt?.toISOString?.() || null,
    },
    userId: reminder.user.id,
    eventId: reminder.event?.id,
  });

  if (!sent) return;

  await prisma.agendaReminder.update({
    where: { id: reminder.id },
    data: { emailSentAt: new Date() },
  });
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
