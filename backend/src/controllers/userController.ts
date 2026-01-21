import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

const isAdminRole = (role?: string) => role === 'ADMIN' || role === 'SUPERADMIN';
const isSuperadminRole = (role?: string) => role === 'SUPERADMIN';

const resolveTargetOrgId = (req: AuthRequest, bodyOrgId?: string) => {
  if (isSuperadminRole(req.user?.role) && bodyOrgId) {
    return bodyOrgId;
  }
  return req.user?.orgId || null;
};

const canAssignRole = (requesterRole?: string, targetRole?: string) => {
  if (!targetRole) return true;
  if (targetRole === 'SUPERADMIN') {
    return isSuperadminRole(requesterRole);
  }
  return true;
};

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!isAdminRole(role)) {
      return res.status(403).json({ error: 'Se requiere rol de administrador' });
    }

    const users = await prisma.user.findMany({
      where: orgId
        ? { organizationMemberships: { some: { organizationId: orgId } } }
        : {},
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        organizationMemberships: orgId
          ? {
              where: { organizationId: orgId },
              select: { role: true },
            }
          : false,
      },
      orderBy: { name: 'asc' },
    });

    const response = users.map((user) => {
      const membershipRole = Array.isArray(user.organizationMemberships)
        ? user.organizationMemberships[0]?.role
        : null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgRole: membershipRole,
        createdAt: user.createdAt,
      };
    });

    res.json(response);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = req.user?.role;
    if (!isAdminRole(requesterRole)) {
      return res.status(403).json({ error: 'Se requiere rol de administrador' });
    }

    const { email, name, password, role, orgRole, organizationId } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ error: 'Email y nombre son requeridos' });
    }

    if (!canAssignRole(requesterRole, role)) {
      return res.status(403).json({ error: 'No autorizado para asignar ese rol' });
    }

    const targetOrgId = resolveTargetOrgId(req, organizationId);
    if (!targetOrgId) {
      return res.status(400).json({ error: 'Organización requerida' });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    if (!user) {
      if (!password) {
        return res.status(400).json({ error: 'Password requerido para crear usuario nuevo' });
      }
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: role || 'USER',
          currentOrgId: targetOrgId,
        },
      });
    } else {
      if (user.role === 'SUPERADMIN' && !isSuperadminRole(requesterRole)) {
        return res.status(403).json({ error: 'No autorizado para modificar SUPERADMIN' });
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          role: role || user.role,
          password: user.password || hashedPassword || undefined,
          currentOrgId: user.currentOrgId || targetOrgId,
        },
      });
    }

    const membershipRole = orgRole || (role === 'ADMIN' ? 'ADMIN' : 'MEMBER');
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId: user.id,
        },
      },
      create: {
        organizationId: targetOrgId,
        userId: user.id,
        role: membershipRole,
      },
      update: { role: membershipRole },
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgRole: membershipRole,
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const requesterRole = req.user?.role;
    if (!isAdminRole(requesterRole)) {
      return res.status(403).json({ error: 'Se requiere rol de administrador' });
    }

    const { id } = req.params;
    const { name, role, password, orgRole, organizationId } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'ID de usuario requerido' });
    }

    if (!canAssignRole(requesterRole, role)) {
      return res.status(403).json({ error: 'No autorizado para asignar ese rol' });
    }

    const targetOrgId = resolveTargetOrgId(req, organizationId);
    if (!targetOrgId) {
      return res.status(400).json({ error: 'Organización requerida' });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId: id,
        },
      },
    });

    if (!membership && !isSuperadminRole(requesterRole)) {
      return res.status(403).json({ error: 'Usuario fuera de tu organización' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role === 'SUPERADMIN' && !isSuperadminRole(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para modificar SUPERADMIN' });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? user.name,
        role: role ?? user.role,
        password: hashedPassword ?? undefined,
      },
    });

    let updatedOrgRole = membership?.role || null;
    if (orgRole) {
      const updatedMembership = await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: targetOrgId,
            userId: id,
          },
        },
        create: {
          organizationId: targetOrgId,
          userId: id,
          role: orgRole,
        },
        update: { role: orgRole },
      });
      updatedOrgRole = updatedMembership.role;
    }

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      orgRole: updatedOrgRole,
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};
