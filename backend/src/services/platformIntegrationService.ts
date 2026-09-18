import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import prisma from '../config/database';

export type IntegrationConfig = {
  general: { frontendUrl: string };
  google: { enabled: boolean; clientId: string; clientSecret: string; callbackUrl: string };
  smtp: { enabled: boolean; host: string; port: number; secure: boolean; user: string; password: string; from: string; adminEmail: string };
  whatsapp: { enabled: boolean; mode: 'link' | 'cloud'; phoneNumber: string; phoneNumberId: string; businessAccountId: string; apiVersion: string; accessToken: string; verifyToken: string; appSecret: string };
  telegram: { enabled: boolean; botToken: string; chatId: string; webhookSecret: string };
};

export const SECRET_FIELDS = ['google.clientSecret', 'smtp.password', 'whatsapp.accessToken', 'whatsapp.verifyToken', 'whatsapp.appSecret', 'telegram.botToken', 'telegram.webhookSecret'] as const;
export class IntegrationError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** La clave de cifrado se conserva exclusivamente en el entorno del servidor. */
function encryptionKey() {
  const key = process.env.INTEGRATIONS_ENCRYPTION_KEY || '';
  if (!/^[a-f\d]{64}$/i.test(key)) throw new IntegrationError('Configura INTEGRATIONS_ENCRYPTION_KEY (64 caracteres hexadecimales) en el servidor antes de guardar.', 503);
  return Buffer.from(key, 'hex');
}

/** Cifra y autentica la configuración completa para que un backup no exponga credenciales. */
export function encryptIntegrationConfig(config: IntegrationConfig) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from('PoolInstaller:integrations:v1'));
  const data = Buffer.concat([cipher.update(JSON.stringify(config), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}

/** Rechaza una configuración alterada o cifrada con otra clave; nunca usa fallback silencioso. */
export function decryptIntegrationConfig(payload: string): IntegrationConfig {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new IntegrationError('Configuración cifrada inválida.', 503);
  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64'));
    decipher.setAAD(Buffer.from('PoolInstaller:integrations:v1'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8'));
  } catch {
    throw new IntegrationError('No se puede descifrar la configuración. Revisa la clave del servidor.', 503);
  }
}

/** Mantiene compatibilidad con instalaciones configuradas mediante variables de entorno. */
export function environmentIntegrationConfig(): IntegrationConfig {
  const env = process.env;
  return {
    general: { frontendUrl: env.FRONTEND_URL || (env.NODE_ENV === 'production' ? '' : 'http://localhost:5173') },
    google: { enabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL), clientId: env.GOOGLE_CLIENT_ID || '', clientSecret: env.GOOGLE_CLIENT_SECRET || '', callbackUrl: env.GOOGLE_CALLBACK_URL || '' },
    smtp: { enabled: Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS), host: env.SMTP_HOST || '', port: Number(env.SMTP_PORT || 587), secure: env.SMTP_SECURE === 'true' || env.SMTP_PORT === '465', user: env.SMTP_USER || '', password: env.SMTP_PASS || '', from: env.SMTP_FROM || env.SMTP_USER || '', adminEmail: env.ADMIN_EMAIL || env.SMTP_USER || '' },
    whatsapp: { enabled: false, mode: 'link', phoneNumber: '', phoneNumberId: '', businessAccountId: '', apiVersion: '', accessToken: '', verifyToken: '', appSecret: '' },
    telegram: { enabled: false, botToken: '', chatId: '', webhookSecret: '' },
  };
}

/** Lee una única versión persistida; tabla aún no migrada sólo permite configuración de entorno. */
async function readStoredConfig() {
  try { return await prisma.platformIntegrationSetting.findUnique({ where: { id: 'global' } }); }
  catch (error: any) {
    if (error?.code === 'P2021') return null;
    throw error;
  }
}
export async function getIntegrationConfig(): Promise<IntegrationConfig> {
  const row = await readStoredConfig();
  return row ? decryptIntegrationConfig(row.payload) : environmentIntegrationConfig();
}
export async function getPublicFrontendUrl() {
  const { general } = await getIntegrationConfig();
  if (!general.frontendUrl) throw new IntegrationError('Falta configurar la URL pública de la aplicación.', 503);
  return general.frontendUrl.replace(/\/$/, '');
}

function validateUrl(value: string, name: string) {
  if (!value) return;
  try {
    const url = new URL(value);
    const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.username || url.password || url.hash || url.search || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) throw new Error();
  } catch { throw new IntegrationError(`${name}: ingresa una URL HTTPS sin parámetros ni credenciales.`); }
}

/** Sólo admite campos conocidos. Vacío conserva el secreto, null lo elimina explícitamente. */
export function mergeIntegrationConfig(current: IntegrationConfig, patch: any): IntegrationConfig {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new IntegrationError('Configuración inválida.');
  const next = JSON.parse(JSON.stringify(current)) as IntegrationConfig;
  for (const [group, fields] of Object.entries(patch)) {
    if (!Object.prototype.hasOwnProperty.call(next, group) || !fields || typeof fields !== 'object' || Array.isArray(fields)) throw new IntegrationError('Sección de configuración desconocida.');
    for (const [field, value] of Object.entries(fields)) {
      const destination = (next as any)[group];
      if (!Object.prototype.hasOwnProperty.call(destination, field)) throw new IntegrationError('Campo de configuración desconocido.');
      const secret = (SECRET_FIELDS as readonly string[]).includes(`${group}.${field}`);
      if (secret && value === '') continue;
      if (secret && value === null) { destination[field] = ''; continue; }
      if (typeof value !== typeof destination[field]) throw new IntegrationError(`Tipo inválido para ${group}.${field}.`);
      if (typeof value === 'string') {
        if (value.length > 4096 || /[\r\n\x00]/.test(value)) throw new IntegrationError(`Valor inválido para ${group}.${field}.`);
        destination[field] = secret ? value : value.trim();
      } else destination[field] = value;
    }
  }
  validateUrl(next.general.frontendUrl, 'URL pública');
  validateUrl(next.google.callbackUrl, 'Callback Google');
  if (!Number.isInteger(next.smtp.port) || next.smtp.port < 1 || next.smtp.port > 65535) throw new IntegrationError('Puerto SMTP inválido.');
  if (next.smtp.host && !/^[a-z\d.-]+$/i.test(next.smtp.host)) throw new IntegrationError('Host SMTP inválido.');
  const emailPattern = /^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/;
  const sender = next.smtp.from.match(/^[^<>]*<([^<>]+)>$/)?.[1] || next.smtp.from;
  if (next.smtp.from && !emailPattern.test(sender)) throw new IntegrationError('Remitente SMTP inválido.');
  if (next.smtp.adminEmail && !emailPattern.test(next.smtp.adminEmail)) throw new IntegrationError('Correo del administrador inválido.');
  if (!['link', 'cloud'].includes(next.whatsapp.mode)) throw new IntegrationError('Modo de WhatsApp inválido.');
  if (next.whatsapp.phoneNumber && !/^\d{8,15}$/.test(next.whatsapp.phoneNumber)) throw new IntegrationError('WhatsApp: usa el número internacional, sólo dígitos.');
  for (const value of [next.whatsapp.phoneNumberId, next.whatsapp.businessAccountId]) {
    if (value && !/^\d+$/.test(value)) throw new IntegrationError('Los identificadores de Meta deben ser numéricos.');
  }
  if (next.whatsapp.apiVersion && !/^v\d{1,3}\.\d+$/.test(next.whatsapp.apiVersion)) throw new IntegrationError('Versión Graph API inválida.');
  if (next.telegram.botToken && !/^\d+:[a-z\d_-]+$/i.test(next.telegram.botToken)) throw new IntegrationError('Token de Telegram inválido.');
  if (next.telegram.chatId && !/^(?:-?\d+|@[a-z\d_]{5,})$/i.test(next.telegram.chatId)) throw new IntegrationError('Chat ID de Telegram inválido.');
  const ready = integrationReadiness(next);
  for (const group of ['google', 'smtp', 'whatsapp', 'telegram'] as const) {
    if (next[group].enabled && !ready[group]) throw new IntegrationError(`Completa los campos obligatorios de ${group} antes de habilitarlo.`);
  }
  return next;
}

/** Disponibilidad de configuración, no una afirmación de conexión verificada al proveedor. */
export function integrationReadiness(config: IntegrationConfig) {
  return {
    google: Boolean(config.general.frontendUrl && config.google.clientId && config.google.clientSecret && config.google.callbackUrl),
    smtp: Boolean(config.smtp.host && config.smtp.user && config.smtp.password && config.smtp.from && config.general.frontendUrl),
    whatsapp: config.whatsapp.mode === 'link' ? Boolean(config.whatsapp.phoneNumber) : Boolean(config.whatsapp.phoneNumberId && config.whatsapp.accessToken && config.whatsapp.apiVersion),
    telegram: Boolean(config.telegram.botToken && config.telegram.chatId),
  };
}

/** Nunca devuelve secretos al navegador, ni siquiera a un superadministrador. */
export function integrationAdminView(config: IntegrationConfig, revision: number) {
  const masked = JSON.parse(JSON.stringify(config));
  const secretsConfigured: Record<string, boolean> = {};
  for (const key of SECRET_FIELDS) {
    const [group, field] = key.split('.');
    secretsConfigured[key] = Boolean(masked[group][field]);
    masked[group][field] = '';
  }
  return { config: masked, revision, secretsConfigured, storageReady: /^[a-f\d]{64}$/i.test(process.env.INTEGRATIONS_ENCRYPTION_KEY || ''), readiness: integrationReadiness(config) };
}
export async function getIntegrationAdminView() {
  const row = await readStoredConfig();
  return integrationAdminView(row ? decryptIntegrationConfig(row.payload) : environmentIntegrationConfig(), row?.revision || 0);
}

/** Control de versión para impedir que dos sesiones sobrescriban credenciales nuevas. */
export async function saveIntegrationConfig(patch: unknown, revision: number) {
  if (!Number.isInteger(revision) || revision < 0) throw new IntegrationError('Versión de configuración inválida.');
  const row = await readStoredConfig();
  if ((row?.revision || 0) !== revision) throw new IntegrationError('La configuración cambió. Recarga antes de guardar.', 409);
  const current = row ? decryptIntegrationConfig(row.payload) : environmentIntegrationConfig();
  const config = mergeIntegrationConfig(current, patch);
  const payload = encryptIntegrationConfig(config);
  try {
    if (!row) await prisma.platformIntegrationSetting.create({ data: { id: 'global', payload, revision: 1 } });
    else {
      const result = await prisma.platformIntegrationSetting.updateMany({ where: { id: 'global', revision }, data: { payload, revision: { increment: 1 } } });
      if (result.count !== 1) throw new IntegrationError('La configuración cambió. Recarga antes de guardar.', 409);
    }
  } catch (error: any) {
    if (error?.code === 'P2002') throw new IntegrationError('La configuración cambió. Recarga antes de guardar.', 409);
    if (error?.code === 'P2021') throw new IntegrationError('Ejecuta las migraciones del servidor antes de guardar.', 503);
    throw error;
  }
  return integrationAdminView(config, revision + 1);
}
