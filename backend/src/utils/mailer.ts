import nodemailer from 'nodemailer';

type SendEmailPayload = {
  to: string[];
  subject: string;
  html: string;
  text?: string;
};

let transporter: nodemailer.Transporter | null = null;
let transporterReady = false;

const getTransporter = () => {
  if (transporterReady) return transporter;
  transporterReady = true;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[MAILER] SMTP no configurado. Emails deshabilitados.');
    transporter = null;
    return transporter;
  }

  try {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false,
      auth: { user, pass },
    });
  } catch (error) {
    console.error('[MAILER] Error al configurar SMTP:', error);
    transporter = null;
  }

  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }: SendEmailPayload) => {
  const mailer = getTransporter();
  if (!mailer || to.length === 0) return false;

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to.join(','),
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error('[MAILER] Error al enviar email:', error);
    return false;
  }
};
