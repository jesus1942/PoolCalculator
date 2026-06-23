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
  const excludeFields = ['id', 'createdAt', 'updatedAt', 'organizationId', 'organization'];

  for (const key in body) {
    if (excludeFields.includes(key)) continue;
    const value = body[key];

    if (key === 'pricePerUnit') {
      parsed[key] = parseFloat(value) || 0;
    } else if (key === 'length') {
      parsed[key] = value ? parseFloat(value) : null;
    } else {
      parsed[key] = value || null;
    }
  }

  return parsed;
};

export const getPlumbingItems = async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user?.orgId || null;
    const { search, category, type } = req.query;

    // Componemos con AND: visibilidad del tenant + filtros opcionales (sin pisar
    // el OR de visibilidad con el OR de búsqueda).
    const and: any[] = [catalogVisibilityWhere(orgId)];

    if (search) {
      and.push({
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { diameter: { contains: search as string, mode: 'insensitive' } },
        ],
      });
    }
    if (category) and.push({ category });
    if (type) and.push({ type });

    const items = await prisma.plumbingItem.findMany({
      where: { AND: and },
      orderBy: [
        { category: 'asc' },
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json(sortTenantFirst(items, orgId));
  } catch (error) {
    console.error('Error al obtener items de plomería:', error);
    res.status(500).json({ error: 'Error al obtener items' });
  }
};

export const createPlumbingItem = async (req: AuthRequest, res: Response) => {
  try {
    const data = parseFormData(req.body);
    const organizationId = resolveCreateOrganizationId(
      { role: req.user?.role, orgId: req.user?.orgId || null },
      req.body?.organizationId,
    );

    const item = await prisma.plumbingItem.create({
      data: { ...data, organizationId },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error('Error al crear item:', error);
    res.status(500).json({ error: 'Error al crear item' });
  }
};

export const updatePlumbingItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.plumbingItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés modificar un item de otra organización o del catálogo global' });
    }

    const data = parseFormData(req.body);
    const item = await prisma.plumbingItem.update({
      where: { id },
      data,
    });

    res.json(item);
  } catch (error) {
    console.error('Error al actualizar item:', error);
    res.status(500).json({ error: 'Error al actualizar item' });
  }
};

export const deletePlumbingItem = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.plumbingItem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    if (!canWriteCatalogRow(existing, { role: req.user?.role, orgId: req.user?.orgId || null })) {
      return res.status(403).json({ error: 'No podés eliminar un item de otra organización o del catálogo global' });
    }

    await prisma.plumbingItem.delete({ where: { id } });

    res.json({ message: 'Item eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar item:', error);
    res.status(500).json({ error: 'Error al eliminar item' });
  }
};
