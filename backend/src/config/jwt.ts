import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';
const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-do-not-use-in-prod';

// En producción exigimos JWT_SECRET seteado: sin él, cualquiera podría forjar
// tokens. Fallamos al arrancar (fail-fast) en vez de degradar silenciosamente.
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error(
    '[CONFIG] JWT_SECRET no está definido en producción. Aborto el arranque para evitar tokens forjables.'
  );
}

if (!isProduction && !process.env.JWT_SECRET) {
  console.warn('[CONFIG] JWT_SECRET no definido: usando secreto de desarrollo inseguro. NO usar en producción.');
}

const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;
const JWT_EXPIRES_IN = '7d';

export const generateToken = (userId: string, email: string, role: string, orgId?: string | null): string => {
  return jwt.sign({ userId, email, role, orgId: orgId || null }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido');
  }
};
