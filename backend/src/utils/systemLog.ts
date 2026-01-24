import prisma from '../config/database';
import { Prisma } from '@prisma/client';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';
type LogCategory = 'AGENDA_NOTIFY' | 'AGENDA_REMINDER' | 'SYSTEM';

type SystemLogPayload = {
  level: LogLevel;
  category: LogCategory;
  message: string;
  meta?: Prisma.JsonObject | null;
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
        meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined,
        userId: userId ?? undefined,
        eventId: eventId ?? undefined,
      },
    });
  } catch (error) {
    console.warn('[SYSTEM-LOG] No se pudo guardar log:', error);
  }
};
