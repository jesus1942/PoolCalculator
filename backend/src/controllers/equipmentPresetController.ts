import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import {
  catalogVisibilityWhere,
  sortTenantFirst,
  canWriteCatalogRow,
  resolveCreateOrganizationId,
} from '../utils/catalogScope';

const parseFormData = (body: any) => {
  const parsed: any = {};

  // organizationId/organization nunca se toman del body: los define el servidor.
  const excludeFields = ['id', 'createdAt', 'updatedAt', 'organizationId', 'organization', 'projectAdditionals'];

  for (const key in body) {
    if (excludeFields.includes(key)) continue;
    const value = body[key];

    if (['power', 'capacity', 'pricePerUnit'].includes(key)) {
      parsed[key] = value ? parseFloat(value) : null;
    } else if (['voltage'].includes(key)) {
      parsed[key] = value ? parseInt(value) : null;
    } else {
      parsed[key] = value;
    }
  }

  return parsed;
};

export const createEquipmentPreset = async (req: AuthRequest, res: Response) => {
  try {
    const data = parseFormData(req.body);
    const organizationId = resolveCreateOrganizationId(
      { role: req.user?.role, orgId: req.user?.orgId || null },
      req.body?.organizationId,
    );
    const equipmentPreset = await prisma.equipmentPreset.create({ data: { ...data, organizationId } });
    res.status(201).json(equipmentPreset);
  } catch (error) {
    console.error('Error al crear preset de equipo:', error);
    res.status(500).json({ error: 'Error al crear preset de equipo' });
  }
};

export const getEquipmentPresets = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user?.orgId || null;
    const equipmentPresets = await prisma.equipmentPreset.findMany({
      where: catalogVisibilityWhere(orgId),
      orderBy: { type: 'asc' },
    });
    res.json(sortTenantFirst(equipmentPresets, orgId));
  } catch (error) {
    console.error('Error al obtener presets de equipos:', error);
    res.status(500).json({ error: 'Error al obtener presets de equipos' });
  }
};

export const updateEquipmentPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.equipmentPreset.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Preset de equipo no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés modificar un preset de otra organización o del catálogo global' });
    }

    const data = parseFormData(req.body);
    const equipmentPreset = await prisma.equipmentPreset.update({
      where: { id },
      data,
    });
    res.json(equipmentPreset);
  } catch (error) {
    console.error('Error al actualizar preset de equipo:', error);
    res.status(500).json({ error: 'Error al actualizar preset de equipo' });
  }
};

export const deleteEquipmentPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.equipmentPreset.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Preset de equipo no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés eliminar un preset de otra organización o del catálogo global' });
    }

    await prisma.equipmentPreset.delete({ where: { id } });
    res.json({ message: 'Preset de equipo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar preset de equipo:', error);
    res.status(500).json({ error: 'Error al eliminar preset de equipo' });
  }
};
