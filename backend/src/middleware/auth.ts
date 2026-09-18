import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../config/jwt';
import prisma from '../config/database';
import { effectiveOrganizationRole } from '../utils/authOrganization';

export type AuthRequest = Request;

/** Comprueba la firma y vuelve a validar los permisos/membresías de la cuenta. */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  const match = typeof authorization === 'string' ? /^Bearer\s+(\S+)$/i.exec(authorization) : null;
  if (!match) return res.status(401).json({ error: 'Token no proporcionado' });
  let decoded;
  try {
    decoded = verifyToken(match[1]);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, sessionVersion: true },
    });
    if (!user || user.sessionVersion !== decoded.sessionVersion) {
      return res.status(401).json({ error: 'La sesión ya no está disponible. Iniciá sesión nuevamente.' });
    }
    let effectiveRole: string = user.role;
    if (user.role !== 'SUPERADMIN') {
      if (!decoded.orgId) return res.status(401).json({ error: 'Iniciá sesión nuevamente para seleccionar tu organización' });
      const membership = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: decoded.orgId, userId: user.id } },
        select: { role: true },
      });
      if (!membership) return res.status(403).json({ error: 'Ya no tenés acceso a esta organización' });
      effectiveRole = effectiveOrganizationRole(user.role, membership.role);
    }
    req.user = { userId: user.id, email: user.email, role: effectiveRole, orgId: decoded.orgId };
    const path = (req.originalUrl || '').split('?')[0].replace(/\/+$/, '');
    const readOnlyMethod = ['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (effectiveRole === 'VIEWER' && !readOnlyMethod && path !== '/api/organizations/switch') {
      return res.status(403).json({ error: 'Tu acceso a esta organización es de solo lectura' });
    }
    if (effectiveRole === 'INSTALLER') {
      const allowedPrefixes = [
        '/api/agenda', '/api/weather', '/api/projects', '/api/project-updates',
        '/api/conversations', '/api/organizations',
      ];
      const allowed = allowedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
      if (!allowed) return res.status(403).json({ error: 'Acceso restringido para instaladores' });
    }
    return next();
  } catch (error) {
    console.error('Error al verificar la sesión:', error);
    return res.status(503).json({ error: 'No se pudo verificar la sesión. Intentá nuevamente.' });
  }
};

/** Autoriza los roles administrativos, siempre después de authenticate. */
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
  }
  next();
};

/** Reserva operaciones de plataforma al proveedor del servicio. */
export const isSuperadmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'SUPERADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol SUPERADMIN' });
  }
  next();
};
