import jwt from 'jsonwebtoken';

const DEFAULT_DEV_SECRET = 'secret-key-change-in-production';
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_DEV_SECRET;
const JWT_EXPIRES_IN = '7d';

// Si en producción no se configuró JWT_SECRET, cualquiera podría falsificar
// tokens con el secreto por defecto (público en el código). Avisamos de forma
// prominente para que se configure la variable de entorno en Railway.
if (JWT_SECRET === DEFAULT_DEV_SECRET && process.env.NODE_ENV === 'production') {
  console.error(
    '[SEGURIDAD] ⚠️ JWT_SECRET no está configurado en producción: se está usando el ' +
    'secreto por defecto del código. Configurá la variable de entorno JWT_SECRET en Railway ' +
    'de inmediato — de lo contrario los tokens de sesión pueden ser falsificados.'
  );
}

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
