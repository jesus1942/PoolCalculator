import prisma from '../config/database';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';
type LogCategory = 'AGENDA_NOTIFY' | 'AGENDA_REMINDER' | 'SYSTEM';

type SystemLogPayload = {
  level: LogLevel;
  category: LogCategory;
  message: string;
  meta?: Record<string, unknown> | null;
  userId?: string | null;
  eventId?: string | null;
};

export const logSystemEvent = async ({
  level,
  category,
  message,
  meta,
  userId,
  eventId,
}: SystemLogPayload) => {
  try {
    await prisma.systemLog.create({
      data: {
        level,
        category,
        message,
        meta: meta ?? undefined,
        userId: userId ?? undefined,
        eventId: eventId ?? undefined,
      },
    });
  } catch (error) {
    console.warn('[SYSTEM-LOG] No se pudo guardar log:', error);
  }
};
