import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendEmail } from '../utils/mailer';
import { getIntegrationConfig } from '../services/platformIntegrationService';

class ContactValidationError extends Error {}

/** Valida texto antes de persistirlo; nunca usa HTML aportado por el visitante. */
function field(body: any, name: string, required = false, max = 300) {
  const value = body?.[name];
  if (value === undefined || value === null || value === '') {
    if (required) throw new ContactValidationError(`El campo ${name} es obligatorio.`);
    return '';
  }
  if (typeof value !== 'string' || value.trim().length > max || /\x00/.test(value)) throw new ContactValidationError(`El campo ${name} no es válido.`);
  const text = value.trim();
  if (required && !text) throw new ContactValidationError(`El campo ${name} es obligatorio.`);
  return text;
}
function positiveDimension(body: any, name: string) {
  const raw = body?.[name];
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'number' && typeof raw !== 'string') throw new ContactValidationError(`Medida ${name} inválida.`);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || value > 10000) throw new ContactValidationError(`Medida ${name} inválida.`);
  return value;
}
function contactIdentity(body: any, phoneRequired = false) {
  const name = field(body, 'name', true, 160);
  const email = field(body, 'email', true, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ContactValidationError('Ingresa un correo válido.');
  return { name, email, phone: field(body, 'phone', phoneRequired, 50) };
}
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Una sola entrega de email para todos los formularios, con la configuración del superusuario. */
async function notifyContact(subject: string, values: Record<string, unknown>) {
  try {
    const { smtp } = await getIntegrationConfig();
    const recipient = smtp.adminEmail || smtp.user;
    if (!recipient) return;
    const text = Object.entries(values).map(([key, value]) => `${key}: ${value ?? 'No indicado'}`).join('\n');
    await sendEmail({
      to: [recipient], subject,
      text,
      html: `<h2>${escapeHtml(subject)}</h2><dl>${Object.entries(values).map(([key, value]) => `<dt><strong>${escapeHtml(key)}</strong></dt><dd style="white-space:pre-wrap">${escapeHtml(value ?? 'No indicado')}</dd>`).join('')}</dl>`,
    });
  } catch {
    // La consulta ya está persistida. Un fallo de entrega no debe provocar reenvíos duplicados.
    console.error('[CONTACT] Consulta registrada; notificación no disponible.');
  }
}
function failure(res: Response, error: unknown) {
  return res.status(error instanceof ContactValidationError ? 400 : 500).json({ error: error instanceof ContactValidationError ? error.message : 'No se pudo registrar la consulta. Intenta nuevamente.' });
}

/** Registra una consulta comercial y notifica sin exponer datos personales en logs. */
export const submitContactForm = async (req: Request, res: Response) => {
  try {
    const identity = contactIdentity(req.body);
    const subject = field(req.body, 'subject', true, 200);
    if (/[\r\n]/.test(subject)) throw new ContactValidationError('Asunto inválido.');
    const message = field(req.body, 'message', true, 10000);
    const row = await prisma.contactForm.create({ data: { ...identity, phone: identity.phone || null, subject, message, status: 'PENDING' } });
    await notifyContact(`Consulta PoolInstaller: ${subject}`, { Nombre: identity.name, Email: identity.email, Teléfono: identity.phone, Mensaje: message });
    return res.json({ message: 'Consulta registrada correctamente', data: { id: row.id, name: identity.name, email: identity.email, subject } });
  } catch (error) { return failure(res, error); }
};

/** Conserva la solicitud de presupuesto y sus campos sin duplicar el transporte de correo. */
export const submitQuoteRequest = async (req: Request, res: Response) => {
  try {
    const identity = contactIdentity(req.body, true);
    const location = field(req.body, 'location', true);
    const data = {
      ...identity, location,
      spaceLength: positiveDimension(req.body, 'spaceLength'), spaceWidth: positiveDimension(req.body, 'spaceWidth'),
      selectedPoolId: field(req.body, 'selectedPoolId') || null, additionalInfo: field(req.body, 'additionalInfo', false, 10000) || null,
      budget: field(req.body, 'budget') || null, timeframe: field(req.body, 'timeframe') || null,
    };
    const row = await prisma.quoteRequest.create({ data: { ...data, status: 'PENDING' } });
    await notifyContact('Solicitud de presupuesto — PoolInstaller', data);
    return res.json({ message: 'Solicitud registrada correctamente', data: { id: row.id, name: identity.name, email: identity.email, location } });
  } catch (error) { return failure(res, error); }
};

/** Guarda el contexto del calculador para que el cliente no repita la misma información. */
export const submitCalculatorInquiry = async (req: Request, res: Response) => {
  try {
    const identity = contactIdentity(req.body, true);
    const data = {
      ...identity,
      message: field(req.body, 'message', false, 10000) || null, poolId: field(req.body, 'poolId') || null, poolName: field(req.body, 'poolName') || null,
      spaceLength: positiveDimension(req.body, 'spaceLength'), spaceWidth: positiveDimension(req.body, 'spaceWidth'),
    };
    const row = await prisma.calculatorInquiry.create({ data: { ...data, status: 'PENDING' } });
    await notifyContact('Consulta del calculador — PoolInstaller', data);
    return res.json({ message: 'Consulta registrada correctamente', data: { id: row.id, name: identity.name, email: identity.email, poolName: data.poolName } });
  } catch (error) { return failure(res, error); }
};
