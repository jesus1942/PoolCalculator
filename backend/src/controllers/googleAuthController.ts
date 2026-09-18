import { Request, Response, NextFunction } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import passport, { ensureGoogleStrategy } from '../config/passport';
import { generateToken, signOAuthState, verifyOAuthState } from '../config/jwt';
import { ensureCurrentOrganization, getSessionRole } from '../utils/authOrganization';
import { getPublicFrontendUrl } from '../services/platformIntegrationService';

const STATE_COOKIE = 'poolinstaller_oauth_state';
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/api/auth/google' };

/** Compara el desafío firmado de Google con la cookie del mismo navegador. */
export const matchesOAuthState = (req: Request): boolean => {
  const state = req.query.state;
  if (typeof state !== 'string' || !verifyOAuthState(state)) return false;
  const rawCookie = req.headers.cookie?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${STATE_COOKIE}=`));
  if (!rawCookie) return false;
  try {
    const cookie = decodeURIComponent(rawCookie.slice(STATE_COOKIE.length + 1));
    const expected = Buffer.from(state);
    const actual = Buffer.from(cookie);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
};

/** Inicia OAuth usando la configuración vigente y una cookie anti-CSRF. */
export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!(await ensureGoogleStrategy())) return res.status(503).json({ error: 'El acceso con Google todavía no está configurado' });
    const state = signOAuthState(randomBytes(32).toString('hex'));
    res.cookie(STATE_COOKIE, state, { ...cookieOptions, maxAge: 10 * 60 * 1000 });
    return passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(req, res, next);
  } catch {
    return res.status(503).json({ error: 'No se pudo iniciar el acceso con Google' });
  }
};

/** Completa OAuth con membresía vigente; el JWT viaja en el fragmento de URL. */
export const googleAuthCallback = async (req: Request, res: Response, next: NextFunction) => {
  let frontendUrl: string;
  try {
    frontendUrl = (await getPublicFrontendUrl()).replace(/\/+$/, '');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    const validState = matchesOAuthState(req);
    res.clearCookie(STATE_COOKIE, cookieOptions);
    if (!validState) return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    if (!(await ensureGoogleStrategy())) return res.redirect(`${frontendUrl}/login?error=auth_failed`);
  } catch {
    return res.status(503).json({ error: 'No se pudo completar el acceso con Google' });
  }
  return passport.authenticate('google', { session: false }, async (err: unknown, user: any) => {
    if (err || !user) return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    try {
      const orgId = await ensureCurrentOrganization(user.id);
      const role = await getSessionRole(user.id, user.role, orgId);
      const token = generateToken(user.id, user.email, role, orgId, user.name, user.sessionVersion);
      return res.redirect(`${frontendUrl}/auth/callback#token=${encodeURIComponent(token)}`);
    } catch {
      return res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  })(req, res, next);
};
