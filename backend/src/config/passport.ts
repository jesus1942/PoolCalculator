import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './database';

const hasGoogleOAuth =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
  Boolean(process.env.GOOGLE_CALLBACK_URL);

if (hasGoogleOAuth) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          // Buscar usuario existente por googleId
          let user = await prisma.user.findUnique({
            where: { googleId: profile.id },
          });

          if (user) {
            // Usuario existe, retornar
            return done(null, user);
          }

          // Verificar si existe un usuario con ese email
          const existingEmailUser = await prisma.user.findUnique({
            where: { email: profile.emails?.[0].value },
          });

          if (existingEmailUser) {
            // Si existe un usuario con ese email pero sin googleId, vincularlo
            user = await prisma.user.update({
              where: { id: existingEmailUser.id },
              data: {
                googleId: profile.id,
                provider: 'GOOGLE',
              },
            });
            return done(null, user);
          }

          // Crear nuevo usuario
          user = await prisma.user.create({
            data: {
              email: profile.emails?.[0].value || '',
              name: profile.displayName || 'Usuario de Google',
              googleId: profile.id,
              provider: 'GOOGLE',
              password: null, // No tiene password porque usa OAuth
            },
          });

          return done(null, user);
        } catch (error) {
          console.error('Error en Google OAuth:', error);
          return done(error as Error, undefined);
        }
      }
    )
  );
} else {
  console.warn('[AUTH] Google OAuth desactivado: faltan GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL');
}

export default passport;
