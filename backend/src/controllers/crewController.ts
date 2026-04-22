import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

const isAdminRole = (role?: string) => role === 'ADMIN' || role === 'SUPERADMIN';

const canManageCrew = (crew: { ownerId: string; organizationId?: string | null }, userId: string, role?: string, orgId?: string | null) => {
  if (crew.ownerId === userId) return true;
  if (!isAdminRole(role)) return false;

  if (orgId) {
    return !crew.organizationId || crew.organizationId === orgId;
  }

  return role === 'SUPERADMIN';
};

export const listCrews = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const baseWhere = isAdminRole(role)
      ? {}
      : { members: { some: { userId } } };
    const where = orgId ? { ...baseWhere, organizationId: orgId } : baseWhere;

    const crews = await prisma.crew.findMany({
      where,
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(crews);
  } catch (error) {
    console.error('Error al listar cuadrillas:', error);
    res.status(500).json({ error: 'Error al listar cuadrillas' });
  }
};

export const createCrew = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!isAdminRole(role)) return res.status(403).json({ error: 'Se requiere rol de administrador' });

    const { name, description, memberIds } = req.body;

    const crew = await prisma.crew.create({
      data: {
        name,
        description,
        ownerId: userId,
        organizationId: orgId,
      },
    });

    const membersToAdd = Array.isArray(memberIds) ? memberIds : [];
    if (membersToAdd.length > 0) {
      await prisma.crewMember.createMany({
        data: membersToAdd.map((memberId: string) => ({
          crewId: crew.id,
          userId: memberId,
        })),
        skipDuplicates: true,
      });
    }

    const fullCrew = await prisma.crew.findUnique({
      where: { id: crew.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    res.status(201).json(fullCrew);
  } catch (error) {
    console.error('Error al crear cuadrilla:', error);
    res.status(500).json({ error: 'Error al crear cuadrilla' });
  }
};

export const updateCrew = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!isAdminRole(role)) return res.status(403).json({ error: 'Se requiere rol de administrador' });

    const crew = await prisma.crew.findUnique({ where: { id } });
    if (!crew || (orgId && crew.organizationId && crew.organizationId !== orgId)) {
      return res.status(404).json({ error: 'Cuadrilla no encontrada' });
    }
    if (!canManageCrew(crew, userId, role, orgId)) return res.status(403).json({ error: 'No tenés permiso para editar esta cuadrilla' });

    const { name, description } = req.body;
    const updated = await prisma.crew.update({
      where: { id },
      data: { name, description },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar cuadrilla:', error);
    res.status(500).json({ error: 'Error al actualizar cuadrilla' });
  }
};

export const deleteCrew = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!isAdminRole(role)) return res.status(403).json({ error: 'Se requiere rol de administrador' });

    const crew = await prisma.crew.findUnique({ where: { id } });
    if (!crew || (orgId && crew.organizationId && crew.organizationId !== orgId)) {
      return res.status(404).json({ error: 'Cuadrilla no encontrada' });
    }
    if (!canManageCrew(crew, userId, role, orgId)) return res.status(403).json({ error: 'No tenés permiso para eliminar esta cuadrilla' });

    await prisma.crew.delete({ where: { id } });
    res.json({ message: 'Cuadrilla eliminada' });
  } catch (error) {
    console.error('Error al eliminar cuadrilla:', error);
    res.status(500).json({ error: 'Error al eliminar cuadrilla' });
  }
};

export const addCrewMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId: memberId } = req.body;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!isAdminRole(role)) return res.status(403).json({ error: 'Se requiere rol de administrador' });

    const crew = await prisma.crew.findUnique({ where: { id } });
    if (!crew || (orgId && crew.organizationId && crew.organizationId !== orgId)) {
      return res.status(404).json({ error: 'Cuadrilla no encontrada' });
    }
    if (!canManageCrew(crew, userId, role, orgId)) return res.status(403).json({ error: 'No tenés permiso para editar esta cuadrilla' });

    if (!memberId || typeof memberId !== 'string') {
      return res.status(400).json({ error: 'Se requiere seleccionar una persona' });
    }

    const memberUser = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, currentOrgId: true },
    });

    if (!memberUser || (orgId && memberUser.currentOrgId !== orgId)) {
      return res.status(404).json({ error: 'La persona seleccionada no pertenece a esta organización' });
    }

    await prisma.crewMember.upsert({
      where: { crewId_userId: { crewId: id, userId: memberId } },
      update: {},
      create: {
        crewId: id,
        userId: memberId,
      },
    });

    const updated = await prisma.crew.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al agregar miembro:', error);
    res.status(500).json({ error: 'Error al agregar miembro' });
  }
};

export const removeCrewMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user?.userId;
    const role = req.user?.role;
    const orgId = req.user?.orgId || null;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });
    if (!isAdminRole(role)) return res.status(403).json({ error: 'Se requiere rol de administrador' });

    const crew = await prisma.crew.findUnique({ where: { id } });
    if (!crew || (orgId && crew.organizationId && crew.organizationId !== orgId)) {
      return res.status(404).json({ error: 'Cuadrilla no encontrada' });
    }
    if (!canManageCrew(crew, userId, role, orgId)) return res.status(403).json({ error: 'No tenés permiso para editar esta cuadrilla' });

    await prisma.crewMember.deleteMany({
      where: { crewId: id, userId: memberId },
    });

    const updated = await prisma.crew.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al quitar miembro:', error);
    res.status(500).json({ error: 'Error al quitar miembro' });
  }
};
