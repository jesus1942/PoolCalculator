import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt';

export type AuthRequest = Request;

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    if (decoded?.role === 'INSTALLER') {
      // Los instaladores acceden a su agenda, al clima, a los proyectos que la
      // organización les compartió (ProjectAccess decide qué ven y si editan),
      // a las novedades de esos proyectos y a las conversaciones donde participan.
      // La parte económica queda protegida por canViewFinancials en cada controller.
      const allowedPrefixes = [
        '/api/agenda',
        '/api/weather',
        '/api/projects',
        '/api/project-updates',
        '/api/conversations',
        '/api/organizations',
      ];
      const path = req.originalUrl || '';
      const allowed = allowedPrefixes.some((prefix) => path.startsWith(prefix));
      if (!allowed) {
        return res.status(403).json({ error: 'Acceso restringido para instaladores' });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
  }
  next();
};

export const isSuperadmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol SUPERADMIN' });
  }
  next();
};
