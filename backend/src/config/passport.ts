import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createHash } from 'crypto';
import prisma from './database';
import { getIntegrationConfig } from '../services/platformIntegrationService';

let activeFingerprint = '';

/** Activa OAuth sólo con configuración completa y aplica cambios del superusuario al instante. */
export async function ensureGoogleStrategy(): Promise<boolean> {
  const { google } = await getIntegrationConfig();
  if (!google.enabled || !google.clientId || !google.clientSecret || !google.callbackUrl) return false;
  const fingerprint = createHash('sha256').update(JSON.stringify(google)).digest('hex');
  if (fingerprint === activeFingerprint) return true;
  passport.use(new GoogleStrategy({
    clientID: google.clientId,
    clientSecret: google.clientSecret,
    callbackURL: google.callbackUrl,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      // No vincular una cuenta local por una dirección que Google no haya verificado.
      const verified = (profile as any)._json?.email_verified === true;
      const email = profile.emails?.[0]?.value?.trim().toLowerCase();
      if (!verified || !email) return done(null, false);
      let user = await prisma.user.findUnique({ where: { googleId: profile.id } });
      if (user) return done(null, user);
      const matches = await prisma.user.findMany({ where: { email: { equals: email, mode: 'insensitive' } }, take: 2 });
      // Si hay una colisión histórica, no adivinar qué cuenta debe recibir el acceso.
      if (matches.length > 1) return done(null, false);
      const existing = matches[0];
      if (existing?.googleId && existing.googleId !== profile.id) return done(null, false);
      if (existing) {
        user = await prisma.user.update({ where: { id: existing.id }, data: { googleId: profile.id, provider: 'GOOGLE' } });
      } else {
        user = await prisma.user.create({ data: { email, name: profile.displayName || 'Usuario de Google', googleId: profile.id, provider: 'GOOGLE', password: null } });
      }
      return done(null, user);
    } catch { return done(new Error('No se pudo completar el acceso con Google.')); }
  }));
  activeFingerprint = fingerprint;
  return true;
}

export default passport;
