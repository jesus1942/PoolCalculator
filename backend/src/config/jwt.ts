import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-in-production';
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
