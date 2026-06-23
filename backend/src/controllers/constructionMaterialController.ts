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

    if (['pricePerUnit', 'bagWeight'].includes(key)) {
      parsed[key] = value ? parseFloat(value) : 0;
    } else {
      parsed[key] = value;
    }
  }

  return parsed;
};

export const createConstructionMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const data = parseFormData(req.body);
    const organizationId = resolveCreateOrganizationId(
      { role: req.user?.role, orgId: req.user?.orgId || null },
      req.body?.organizationId,
    );
    const material = await prisma.constructionMaterialPreset.create({ data: { ...data, organizationId } });
    res.status(201).json(material);
  } catch (error) {
    console.error('Error al crear material de construcción:', error);
    res.status(500).json({ error: 'Error al crear material de construcción' });
  }
};

export const getConstructionMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user?.orgId || null;
    const { category, type } = req.query;

    // Combina visibilidad por tenant (org propia + global) con los filtros opcionales.
    const where: any = { ...catalogVisibilityWhere(orgId) };

    if (typeof category === 'string' && category) {
      where.category = category;
    }

    if (typeof type === 'string' && type) {
      where.type = type;
    }

    const materials = await prisma.constructionMaterialPreset.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
    res.json(sortTenantFirst(materials, orgId));
  } catch (error) {
    console.error('Error al obtener materiales de construcción:', error);
    res.status(500).json({ error: 'Error al obtener materiales de construcción' });
  }
};

export const updateConstructionMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.constructionMaterialPreset.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Material de construcción no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés modificar un material de otra organización o del catálogo global' });
    }

    const data = parseFormData(req.body);
    const material = await prisma.constructionMaterialPreset.update({
      where: { id },
      data,
    });
    res.json(material);
  } catch (error) {
    console.error('Error al actualizar material de construcción:', error);
    res.status(500).json({ error: 'Error al actualizar material de construcción' });
  }
};

export const deleteConstructionMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.constructionMaterialPreset.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Material de construcción no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés eliminar un material de otra organización o del catálogo global' });
    }

    await prisma.constructionMaterialPreset.delete({ where: { id } });
    res.json({ message: 'Material de construcción eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar material de construcción:', error);
    res.status(500).json({ error: 'Error al eliminar material de construcción' });
  }
};
