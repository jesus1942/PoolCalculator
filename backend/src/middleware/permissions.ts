import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Middleware para verificar permisos basados en roles
 */

export const isSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'SUPERADMIN') {
    return res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de SUPERADMIN.'
    });
  }
  next();
};

export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de ADMIN o superior.'
    });
  }
  next();
};

export const isAdminOrOwner = (resourceUserId: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    const role = req.user?.role;

    // SUPERADMIN y ADMIN pueden acceder a todo
    if (role === 'SUPERADMIN' || role === 'ADMIN') {
      return next();
    }

    // Usuarios normales solo pueden acceder a sus propios recursos
    if (userId === resourceUserId) {
      return next();
    }

    return res.status(403).json({
      error: 'No tenés permiso para acceder a este recurso.'
    });
  };
};

export const canWrite = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;

  // VIEWER solo puede leer
  if (role === 'VIEWER') {
    return res.status(403).json({
      error: 'Acceso denegado. Los usuarios con rol VIEWER solo tienen permisos de lectura.'
    });
  }

  next();
};

/**
 * Verifica si el usuario puede gestionar otros usuarios
 */
export const canManageUsers = (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.user?.role;

  if (role !== 'SUPERADMIN' && role !== 'ADMIN') {
    return res.status(403).json({
      error: 'No tenés permiso para gestionar usuarios.'
    });
  }

  next();
};

/**
 * Verifica si el usuario puede modificar configuraciones globales
 */
export const canModifyGlobalSettings = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'SUPERADMIN') {
    return res.status(403).json({
      error: 'Solo SUPERADMIN puede modificar configuraciones globales.'
    });
  }

  next();
};

/**
 * Middleware para SaaS: verifica límites de plan
 * (Para implementar más adelante con planes de suscripción)
 */
export interface PlanLimits {
  maxProjects?: number;
  maxUsers?: number;
  maxStorage?: number; // en MB
  features?: string[];
}

export const checkPlanLimits = (limitType: keyof PlanLimits) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // TODO: Implementar lógica de verificación de límites según plan
    // Por ahora, permite todo
    next();
  };
};

/**
 * Tipos de permisos para el sistema SaaS
 */
export enum Permission {
  // Proyectos
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',

  // Presets
  PRESET_CREATE = 'preset:create',
  PRESET_READ = 'preset:read',
  PRESET_UPDATE = 'preset:update',
  PRESET_DELETE = 'preset:delete',

  // Configuraciones
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',

  // Usuarios (para admins)
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Exportación
  EXPORT_BASIC = 'export:basic',
  EXPORT_ADVANCED = 'export:advanced',

  // Timeline
  TIMELINE_CREATE = 'timeline:create',
  TIMELINE_READ = 'timeline:read',
  TIMELINE_UPDATE = 'timeline:update',
  TIMELINE_DELETE = 'timeline:delete',
}

/**
 * Mapa de permisos por rol
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPERADMIN: Object.values(Permission), // Todos los permisos

  ADMIN: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PRESET_CREATE,
    Permission.PRESET_READ,
    Permission.PRESET_UPDATE,
    Permission.PRESET_DELETE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.USER_READ,
    Permission.EXPORT_BASIC,
    Permission.EXPORT_ADVANCED,
    Permission.TIMELINE_CREATE,
    Permission.TIMELINE_READ,
    Permission.TIMELINE_UPDATE,
    Permission.TIMELINE_DELETE,
  ],

  USER: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PRESET_READ,
    Permission.SETTINGS_READ,
    Permission.EXPORT_BASIC,
    Permission.TIMELINE_CREATE,
    Permission.TIMELINE_READ,
    Permission.TIMELINE_UPDATE,
  ],

  VIEWER: [
    Permission.PROJECT_READ,
    Permission.PRESET_READ,
    Permission.SETTINGS_READ,
    Permission.TIMELINE_READ,
    Permission.EXPORT_BASIC,
  ],
};

/**
 * Verifica si un usuario tiene un permiso específico
 */
export const hasPermission = (req: AuthRequest, res: Response, next: NextFunction, permission: Permission) => {
  const role = req.user?.role;

  if (!role) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const permissions = ROLE_PERMISSIONS[role] || [];

  if (!permissions.includes(permission)) {
    return res.status(403).json({
      error: `No tenés permiso para realizar esta acción. Permiso requerido: ${permission}`
    });
  }

  next();
};

/**
 * Helper para crear middleware de permiso específico
 */
export const requirePermission = (permission: Permission) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    hasPermission(req, res, next, permission);
  };
};
