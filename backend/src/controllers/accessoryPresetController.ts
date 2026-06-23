import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import {
  catalogVisibilityWhere,
  sortTenantFirst,
  canWriteCatalogRow,
  resolveCreateOrganizationId,
} from '../utils/catalogScope';

// Quita campos que el cliente no debe poder fijar (incluido organizationId, que
// lo define el servidor según el tenant).
const sanitizeBody = (body: any) => {
  const { id, createdAt, updatedAt, organizationId, organization, projectAdditionals, ...rest } = body || {};
  return rest;
};

export const createAccessoryPreset = async (req: AuthRequest, res: Response) => {
  try {
    const organizationId = resolveCreateOrganizationId(
      { role: req.user?.role, orgId: req.user?.orgId || null },
      req.body?.organizationId,
    );
    const accessoryPreset = await prisma.accessoryPreset.create({
      data: { ...sanitizeBody(req.body), organizationId },
    });

    res.status(201).json(accessoryPreset);
  } catch (error) {
    console.error('Error al crear preset de accesorio:', error);
    res.status(500).json({ error: 'Error al crear preset de accesorio' });
  }
};

export const getAccessoryPresets = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user?.orgId || null;
    const accessoryPresets = await prisma.accessoryPreset.findMany({
      where: catalogVisibilityWhere(orgId),
      orderBy: { type: 'asc' },
    });

    res.json(sortTenantFirst(accessoryPresets, orgId));
  } catch (error) {
    console.error('Error al obtener presets de accesorios:', error);
    res.status(500).json({ error: 'Error al obtener presets de accesorios' });
  }
};

export const updateAccessoryPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.accessoryPreset.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Preset de accesorio no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés modificar un preset de otra organización o del catálogo global' });
    }

    const accessoryPreset = await prisma.accessoryPreset.update({
      where: { id },
      data: sanitizeBody(req.body),
    });

    res.json(accessoryPreset);
  } catch (error) {
    console.error('Error al actualizar preset de accesorio:', error);
    res.status(500).json({ error: 'Error al actualizar preset de accesorio' });
  }
};

export const deleteAccessoryPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.accessoryPreset.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Preset de accesorio no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés eliminar un preset de otra organización o del catálogo global' });
    }

    await prisma.accessoryPreset.delete({ where: { id } });

    res.json({ message: 'Preset de accesorio eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar preset de accesorio:', error);
    res.status(500).json({ error: 'Error al eliminar preset de accesorio' });
  }
};
