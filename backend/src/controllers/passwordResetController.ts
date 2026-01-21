import { Request, Response } from 'express';
import prisma from '../config/database';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';

// Configurar transporter de email
let transporter: nodemailer.Transporter | null = null;

try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('[PASSWORD-RESET] SMTP configurado correctamente');
  } else {
    console.warn('[PASSWORD-RESET] Variables SMTP no configuradas - emails deshabilitados');
  }
} catch (error) {
  console.error('[PASSWORD-RESET] Error al configurar nodemailer:', error);
}

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' });
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Por seguridad, siempre devolvemos éxito aunque el usuario no exista
    if (!user) {
      return res.json({
        message: 'Si el email existe en nuestro sistema, recibirás un link de recuperación',
      });
    }

    // Si el usuario es de OAuth, no puede resetear contraseña
    if (user.provider === 'GOOGLE') {
      return res.status(400).json({
        error: 'Esta cuenta usa inicio de sesión con Google. No puedes resetear la contraseña.',
      });
    }

    // Generar token aleatorio
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token en la base de datos
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // URL de reset (ajusta según tu frontend)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    // Enviar email (solo si el transporter está configurado)
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@poolcalculator.com',
          to: user.email,
          subject: 'Recuperación de Contraseña - Pool Installer',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #06b6d4;">Recuperación de Contraseña</h2>
              <p>Hola ${user.name},</p>
              <p>Recibimos una solicitud para resetear tu contraseña. Haz click en el siguiente botón:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}"
                   style="background-color: #06b6d4; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
                  Resetear Contraseña
                </a>
              </div>
              <p>O copia y pega este link en tu navegador:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Este link expira en 1 hora. Si no solicitaste este cambio, ignora este mensaje.
              </p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('[PASSWORD-RESET] Error al enviar email:', emailError);
        // En producción deberías manejar esto, pero por ahora continuamos
      }
    } else {
      console.log('[PASSWORD-RESET] SMTP no configurado - Token generado pero email no enviado');
      console.log(`[PASSWORD-RESET] URL de reset: ${resetUrl}`);
    }

    res.json({
      message: 'Si el email existe en nuestro sistema, recibirás un link de recuperación',
    });
  } catch (error) {
    console.error('Error al solicitar reset de contraseña:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Buscar token válido
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    // Verificar si ya fue usado
    if (resetToken.used) {
      return res.status(400).json({ error: 'Este token ya fue utilizado' });
    }

    // Verificar si expiró
    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ error: 'Este token ha expirado' });
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y marcar token como usado
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ]);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({ error: 'Error al resetear contraseña' });
  }
};

export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token inválido', valid: false });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
      return res.json({ valid: false });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ error: 'Error al verificar token', valid: false });
  }
};
