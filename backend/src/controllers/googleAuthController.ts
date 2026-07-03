import { Request, Response } from 'express';
import passport from '../config/passport';
import { generateToken } from '../config/jwt';

export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
});

export const googleAuthCallback = (req: Request, res: Response) => {
  console.log('[GOOGLE AUTH] Callback recibido');

  passport.authenticate('google', { session: false }, (err: any, user: any) => {
    console.log('[GOOGLE AUTH] Error:', err);
    console.log('[GOOGLE AUTH] Usuario:', user ? { id: user.id, email: user.email } : 'null');

    if (err || !user) {
      console.error('[GOOGLE AUTH] ❌ Error en callback de Google:', err);
      // Redirigir al frontend con error
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=auth_failed`);
    }

    try {
      // Generar JWT con el helper compartido (mismo secreto y payload que el
      // resto del login, incluyendo orgId). Evita el secreto por defecto propio.
      const token = generateToken(user.id, user.email, user.role, user.orgId ?? null);

      console.log('[GOOGLE AUTH] ✅ Token generado exitosamente');
      console.log('[GOOGLE AUTH] Redirigiendo a:', `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback`);

      // Redirigir al frontend con el token
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('[GOOGLE AUTH] ❌ Error al generar token:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=token_failed`);
    }
  })(req, res);
};
