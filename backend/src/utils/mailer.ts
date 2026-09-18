import nodemailer from 'nodemailer';
import { getIntegrationConfig } from '../services/platformIntegrationService';

type SendEmailPayload = { to: string[]; subject: string; html: string; text?: string };

/** Construye el transporte desde la configuración vigente, sin reiniciar el servidor. */
export async function createConfiguredMailer() {
  const { smtp } = await getIntegrationConfig();
  if (!smtp.enabled || !smtp.host || !smtp.user || !smtp.password || !smtp.from) return null;
  return {
    from: smtp.from,
    transport: nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      requireTLS: !smtp.secure,
      auth: { user: smtp.user, pass: smtp.password },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    }),
  };
}

/** Servicio único de correo para recuperación, agenda y formularios públicos. */
export const sendEmail = async ({ to, subject, html, text }: SendEmailPayload) => {
  if (!to.length) return false;
  try {
    const mailer = await createConfiguredMailer();
    if (!mailer) return false;
    await mailer.transport.sendMail({ from: mailer.from, to: to.join(','), subject, html, text });
    return true;
  } catch {
    // El error de un proveedor puede incluir credenciales o direcciones: no volcarlo al log.
    console.error('[MAILER] No se pudo enviar el correo. Revisa la conexión configurada.');
    return false;
  }
};
