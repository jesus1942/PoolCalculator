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

  // Campos readonly. organizationId nunca se toma del body: lo define el
  // servidor según el tenant, no el cliente.
  const excludeFields = ['id', 'createdAt', 'updatedAt', 'organizationId', 'organization'];

  for (const key in body) {
    // Skip readonly fields
    if (excludeFields.includes(key)) {
      continue;
    }

    const value = body[key];

    // Números decimales
    if (['width', 'length', 'pricePerUnit', 'cornerPricePerUnit'].includes(key)) {
      // Permitir 0 como valor válido (no convertir a null)
      if (value === null || value === undefined || value === '') {
        parsed[key] = key === 'pricePerUnit' ? 0 : null; // pricePerUnit no puede ser null
      } else {
        parsed[key] = parseFloat(value);
      }
    }
    // Números enteros
    else if (['cornersPerTile'].includes(key)) {
      if (value === null || value === undefined || value === '') {
        parsed[key] = null;
      } else {
        parsed[key] = parseInt(value);
      }
    }
    // Booleanos
    else if (['hasCorner', 'isForFirstRing'].includes(key)) {
      parsed[key] = value === 'true' || value === true;
    }
    // Strings normales
    else {
      parsed[key] = value;
    }
  }

  return parsed;
};

export const createTilePreset = async (req: AuthRequest, res: Response) => {
  try {
    const data = parseFormData(req.body);
    const organizationId = resolveCreateOrganizationId(
      { role: req.user?.role, orgId: req.user?.orgId || null },
      req.body?.organizationId,
    );
    const tilePreset = await prisma.tilePreset.create({ data: { ...data, organizationId } });
    res.status(201).json(tilePreset);
  } catch (error) {
    console.error('Error al crear preset de loseta:', error);
    res.status(500).json({ error: 'Error al crear preset de loseta' });
  }
};

export const getTilePresets = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user?.orgId || null;
    const tilePresets = await prisma.tilePreset.findMany({
      where: catalogVisibilityWhere(orgId),
      orderBy: { createdAt: 'desc' },
    });
    res.json(sortTenantFirst(tilePresets, orgId));
  } catch (error) {
    console.error('Error al obtener presets de losetas:', error);
    res.status(500).json({ error: 'Error al obtener presets de losetas' });
  }
};

export const updateTilePreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.tilePreset.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Preset de loseta no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés modificar un preset de otra organización o del catálogo global' });
    }

    const data = parseFormData(req.body);
    const tilePreset = await prisma.tilePreset.update({
      where: { id },
      data,
    });
    res.json(tilePreset);
  } catch (error: any) {
    console.error('Error al actualizar preset de loseta:', error);
    res.status(500).json({
      error: 'Error al actualizar preset de loseta',
      details: error?.message
    });
  }
};

export const deleteTilePreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.tilePreset.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Preset de loseta no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés eliminar un preset de otra organización o del catálogo global' });
    }

    await prisma.tilePreset.delete({ where: { id } });
    res.json({ message: 'Preset de loseta eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar preset de loseta:', error);
    res.status(500).json({ error: 'Error al eliminar preset de loseta' });
  }
};
