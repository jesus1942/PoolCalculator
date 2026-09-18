import { Request, Response } from 'express';
import prisma from '../config/database';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendEmail } from '../utils/mailer';
import { getPublicFrontendUrl } from '../services/platformIntegrationService';
import { normalizeEmail, validNewPassword, PASSWORD_REQUIREMENTS } from '../utils/authValidation';

const GENERIC_RESPONSE = { message: 'Si el email existe en nuestro sistema, recibirás un link de recuperación' };
const validToken = (token: unknown): token is string => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

/** Envía un enlace de un solo uso; solo guarda su huella SHA-256. */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ error: 'Ingresá un email válido' });
    const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user || (user.provider === 'GOOGLE' && !user.password)) return res.json(GENERIC_RESPONSE);
    const token = crypto.randomBytes(32).toString('hex');
    const digest = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({ where: { userId: user.id, used: false }, data: { used: true } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, token: digest, expiresAt } }),
    ]);
    const frontendUrl = await getPublicFrontendUrl();
    const resetUrl = `${frontendUrl.replace(/\/+$/, '')}/reset-password?token=${token}`;
    const sent = await sendEmail({
      to: [user.email],
      subject: 'Recuperación de contraseña - Pool Installer',
      text: `Hola ${user.name}. Usá este enlace para cambiar tu contraseña: ${resetUrl}. Expira en una hora. Si no lo solicitaste, ignorá este mensaje.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>Recuperación de contraseña</h2><p>Hola ${escapeHtml(user.name)},</p><p>Recibimos una solicitud para cambiar tu contraseña.</p><p><a href="${escapeHtml(resetUrl)}">Cambiar contraseña</a></p><p>El enlace expira en una hora. Si no solicitaste el cambio, ignorá este mensaje.</p></div>`,
    });
    if (!sent) {
      await prisma.passwordResetToken.deleteMany({ where: { token: digest } });
      // No se registran el enlace, token, correo ni credenciales del transporte.
      console.error('[PASSWORD-RESET] No se pudo entregar el correo de recuperación');
    }
    return res.json(GENERIC_RESPONSE);
  } catch (error) {
    console.error('[PASSWORD-RESET] No se pudo procesar la solicitud');
    return res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

/** Consume el token atómicamente para impedir dos cambios concurrentes. */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!validToken(token)) return res.status(400).json({ error: 'Token inválido o expirado' });
    if (!validNewPassword(newPassword)) return res.status(400).json({ error: PASSWORD_REQUIREMENTS });
    const digest = hashToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: digest } });
    if (!resetToken || resetToken.used || resetToken.expiresAt <= new Date()) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const changed = await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, token: digest, used: false, expiresAt: { gt: new Date() } },
        data: { used: true },
      });
      if (consumed.count !== 1) return false;
      await tx.user.update({ where: { id: resetToken.userId }, data: { password: hashedPassword, sessionVersion: { increment: 1 } } });
      await tx.passwordResetToken.updateMany({ where: { userId: resetToken.userId, used: false }, data: { used: true } });
      return true;
    });
    if (!changed) return res.status(400).json({ error: 'Token inválido o expirado' });
    return res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('[PASSWORD-RESET] No se pudo cambiar la contraseña');
    return res.status(500).json({ error: 'Error al resetear contraseña' });
  }
};

/** Comprueba vigencia sin revelar la identidad de la cuenta. */
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const token = req.query.token;
    if (!validToken(token)) return res.status(400).json({ valid: false, error: 'Token inválido' });
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token: hashToken(token) } });
    return res.json({ valid: Boolean(resetToken && !resetToken.used && resetToken.expiresAt > new Date()) });
  } catch {
    return res.status(500).json({ error: 'Error al verificar token', valid: false });
  }
};
