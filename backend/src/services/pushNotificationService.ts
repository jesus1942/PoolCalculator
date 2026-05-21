import prisma from '../config/database';
import { randomUUID } from 'crypto';
import { logSystemEvent } from '../utils/systemLog';

type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let webPushClient: any | null | undefined;
let vapidConfigured = false;

const getVapidConfig = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@poolinstaller.app';

  return {
    publicKey: publicKey || null,
    privateKey: privateKey || null,
    subject,
  };
};

const getWebPushClient = () => {
  if (webPushClient !== undefined) return webPushClient;

  try {
    // Carga diferida para no romper el backend si la dependencia todavia no está instalada.
    // Railway la tomará desde package.json en el próximo deploy.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    webPushClient = require('web-push');
  } catch (error) {
    webPushClient = null;
    console.warn('[PUSH] web-push no está disponible:', error);
    return webPushClient;
  }

  return webPushClient;
};

const ensureVapidConfigured = () => {
  if (vapidConfigured) return true;

  const webpush = getWebPushClient();
  const { publicKey, privateKey, subject } = getVapidConfig();
  if (!webpush || !publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
};

const buildStoredSubscription = (subscription: PushSubscriptionInput) => ({
  endpoint: subscription.endpoint,
  expirationTime: subscription.expirationTime ?? null,
  keys: {
    p256dh: subscription.keys?.p256dh || '',
    auth: subscription.keys?.auth || '',
  },
});

export const getPushPublicKey = () => getVapidConfig().publicKey;

export const isPushEnabled = () => Boolean(getPushPublicKey());

export const savePushSubscription = async (userId: string, subscription: PushSubscriptionInput, userAgent?: string) => {
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    throw new Error('Suscripción push inválida');
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; endpoint: string }>>(
    `
      INSERT INTO "PushSubscription" ("id", "userId", "endpoint", "expirationTime", "keys", "userAgent", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW(), NOW())
      ON CONFLICT ("endpoint")
      DO UPDATE SET
        "userId" = EXCLUDED."userId",
        "expirationTime" = EXCLUDED."expirationTime",
        "keys" = EXCLUDED."keys",
        "userAgent" = EXCLUDED."userAgent",
        "updatedAt" = NOW()
      RETURNING "id", "endpoint"
    `,
    randomUUID(),
    userId,
    subscription.endpoint,
    subscription.expirationTime ? new Date(subscription.expirationTime) : null,
    JSON.stringify(subscription.keys),
    userAgent || null,
  );

  return rows[0];
};

export const removePushSubscription = async (userId: string, endpoint: string) => {
  if (!endpoint) return;
  await prisma.$executeRawUnsafe(
    `DELETE FROM "PushSubscription" WHERE "userId" = $1 AND "endpoint" = $2`,
    userId,
    endpoint,
  );
};

export const sendPushNotificationToUser = async (userId: string, payload: PushPayload) => {
  if (!ensureVapidConfigured()) return { delivered: 0, removed: 0, skipped: true };

  const subscriptions = await prisma.$queryRawUnsafe<Array<{
    id: string;
    endpoint: string;
    expirationTime: Date | null;
    keys: { p256dh?: string; auth?: string };
    userAgent: string | null;
  }>>(
    `SELECT "id", "endpoint", "expirationTime", "keys", "userAgent"
     FROM "PushSubscription"
     WHERE "userId" = $1
     ORDER BY "updatedAt" DESC`,
    userId,
  );

  if (subscriptions.length === 0) {
    return { delivered: 0, removed: 0, skipped: false };
  }

  const webpush = getWebPushClient();
  if (!webpush) {
    return { delivered: 0, removed: 0, skipped: true };
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/agenda',
    tag: payload.tag || 'agenda-reminder',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
  });

  let delivered = 0;
  let removed = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(buildStoredSubscription(subscription as any), body, {
        TTL: 60 * 60,
        urgency: 'high',
      });
      delivered += 1;
    } catch (error: any) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.$executeRawUnsafe(`DELETE FROM "PushSubscription" WHERE "id" = $1`, subscription.id);
        removed += 1;
        continue;
      }

      await logSystemEvent({
        level: 'WARN',
        category: 'AGENDA_NOTIFY',
        message: 'No se pudo enviar una notificación push',
        meta: {
          userId,
          endpoint: subscription.endpoint,
          error: String(error),
        },
        userId,
      });
    }
  }

  return { delivered, removed, skipped: false };
};
