import jwt, { JwtPayload } from 'jsonwebtoken';

const DEFAULT_DEV_SECRET = 'secret-key-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;
const JWT_EXPIRES_IN = '7d';

// Impide arrancar producción con una clave pública o demasiado corta.
if (process.env.NODE_ENV === 'production' &&
    (JWT_SECRET === DEFAULT_DEV_SECRET || Buffer.byteLength(JWT_SECRET) < 32)) {
  throw new Error('JWT_SECRET debe ser una clave privada de al menos 32 bytes en producción');
}

export interface SessionClaims extends JwtPayload {
  userId: string;
  email: string;
  role: string;
  orgId: string | null;
  name?: string;
  sessionVersion: number;
}

/** Firma el contexto inicial; los permisos vigentes se recargan al autenticar. */
export const generateToken = (userId: string, email: string, role: string, orgId?: string | null, name?: string, sessionVersion = 0): string =>
  jwt.sign({ userId, email, role, orgId: orgId || null, sessionVersion, ...(name ? { name } : {}) }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });

/** Rechaza algoritmos y payloads ajenos al contrato de sesión. */
export const verifyToken = (token: string): SessionClaims => {
  const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || typeof decoded.userId !== 'string' || !decoded.userId ||
      typeof decoded.email !== 'string' || typeof decoded.role !== 'string' ||
      !Number.isSafeInteger(decoded.sessionVersion) || decoded.sessionVersion < 0 ||
      (decoded.orgId != null && typeof decoded.orgId !== 'string')) {
    throw new Error('Token inválido');
  }
  return { ...decoded, orgId: decoded.orgId || null } as SessionClaims;
};

/** Firma el estado OAuth con una audiencia independiente de las sesiones. */
export const signOAuthState = (nonce: string): string =>
  jwt.sign({ nonce }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '10m', audience: 'google-oauth-state' });

/** Verifica caducidad, firma y finalidad del desafío OAuth. */
export const verifyOAuthState = (state: string): boolean => {
  try {
    const payload = jwt.verify(state, JWT_SECRET, { algorithms: ['HS256'], audience: 'google-oauth-state' });
    return typeof payload !== 'string' && typeof payload.nonce === 'string' && /^[a-f0-9]{64}$/.test(payload.nonce);
  } catch { return false; }
};
