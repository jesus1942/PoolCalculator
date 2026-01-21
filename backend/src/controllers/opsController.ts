import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

const DEFAULT_LOG_LIMIT = 200;
const MAX_LOG_LIMIT = 500;

const parseLimit = (value?: string | string[]) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_LOG_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LOG_LIMIT);
};

export const getOpsStatus = async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  let dbOk = false;
  let dbError: string | null = null;
  const warnings: string[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (error) {
    dbError = String(error);
  }

  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  let remindersPending = 0;
  let remindersDue = 0;
  let lastEmail: { emailSentAt: Date } | null = null;
  let countsByLevel: Record<string, number> = {};

  if (dbOk) {
    try {
      const [pending, due, last] = await Promise.all([
        prisma.agendaReminder.count({
          where: { status: { in: ['PENDING', 'SNOOZED'] } },
        }),
        prisma.agendaReminder.count({
          where: {
            emailSentAt: null,
            status: { in: ['PENDING', 'SNOOZED'] },
            remindAt: { lte: now },
            OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
          },
        }),
        prisma.agendaReminder.findFirst({
          where: { emailSentAt: { not: null } },
          orderBy: { emailSentAt: 'desc' },
          select: { emailSentAt: true },
        }),
      ]);
      remindersPending = pending;
      remindersDue = due;
      lastEmail = last;
    } catch (error) {
      warnings.push('No se pudieron leer métricas de recordatorios');
    }

    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const logCounts = await prisma.systemLog.groupBy({
        by: ['level'],
        where: { createdAt: { gte: since } },
        _count: { level: true },
      });

      countsByLevel = logCounts.reduce<Record<string, number>>((acc, item) => {
        acc[item.level] = item._count.level;
        return acc;
      }, {});
    } catch (error) {
      warnings.push('No se pudieron leer logs del sistema');
    }
  }

  res.json({
    serverTime: now.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    db: {
      ok: dbOk,
      error: dbError,
    },
    smtp: {
      configured: smtpConfigured,
    },
    reminders: {
      pendingCount: remindersPending,
      dueCount: remindersDue,
      lastEmailSentAt: lastEmail?.emailSentAt || null,
      intervalMs: Number(process.env.REMINDER_EMAIL_INTERVAL_MS || 5 * 60 * 1000),
      batchSize: Number(process.env.REMINDER_EMAIL_BATCH || 50),
      lookbackMs: Number(process.env.REMINDER_EMAIL_LOOKBACK_MS || 24 * 60 * 60 * 1000),
    },
    logs: {
      last24h: countsByLevel,
    },
    warnings,
  });
};

export const listOpsLogs = async (req: AuthRequest, res: Response) => {
  const limit = parseLimit(req.query.limit);
  const level = typeof req.query.level === 'string' ? req.query.level : undefined;
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;

  try {
    const logs = await prisma.systemLog.findMany({
      where: {
        ...(level ? { level: level as any } : {}),
        ...(category ? { category: category as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({
      logs: logs.map((log) => ({
        id: log.id,
        level: log.level,
        category: log.category,
        message: log.message,
        meta: log.meta,
        createdAt: log.createdAt,
        user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email } : null,
        eventId: log.eventId,
      })),
    });
  } catch (error) {
    res.json({ logs: [] });
  }
};
