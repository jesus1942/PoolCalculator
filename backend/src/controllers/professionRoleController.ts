import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import {
  getReferenceRoleBlueprints,
  getRoleAliases,
  PUERTO_MADRYN_LABOR_REFERENCE,
} from '../utils/laborReferences';

const parseFormData = (body: any) => {
  const parsed: any = {};
  
  for (const key in body) {
    const value = body[key];

    if (['hourlyRate', 'dailyRate', 'ratePerUnit'].includes(key)) {
      parsed[key] = value !== undefined && value !== '' ? parseFloat(value) : null;
    } else if (key === 'bocaRates') {
      parsed[key] = value || [];
    } else if (key === 'billingType') {
      parsed[key] = value || 'HOUR';
    } else {
      parsed[key] = value || null;
    }
  }
  
  return parsed;
};

const DEFAULT_ROLES = getReferenceRoleBlueprints().map(({ aliases, ...role }) => role);

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getProfessionRoles = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    let roles = await prisma.professionRole.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    // Si no tiene roles, crear los predefinidos
    if (roles.length === 0) {
      console.log('📋 Creando roles predefinidos para usuario:', userId);
      await prisma.professionRole.createMany({
        data: DEFAULT_ROLES.map(role => ({
          ...role,
          userId,
        })),
      });
      
      roles = await prisma.professionRole.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
      });
    }

    res.json(roles);
  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({ error: 'Error al obtener roles' });
  }
};

export const createProfessionRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const data = parseFormData(req.body);
    
    const role = await prisma.professionRole.create({
      data: {
        ...data,
        userId,
      },
    });

    res.status(201).json(role);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
    }
    console.error('Error al crear rol:', error);
    res.status(500).json({ error: 'Error al crear rol' });
  }
};

export const updateProfessionRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar que el rol pertenece al usuario
    const existing = await prisma.professionRole.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    const data = parseFormData(req.body);
    
    const role = await prisma.professionRole.update({
      where: { id },
      data,
    });

    res.json(role);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
    }
    console.error('Error al actualizar rol:', error);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
};

export const deleteProfessionRole = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar que el rol pertenece al usuario
    const existing = await prisma.professionRole.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    await prisma.professionRole.delete({
      where: { id },
    });

    res.json({ message: 'Rol eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar rol:', error);
    res.status(500).json({ error: 'Error al eliminar rol' });
  }
};

export const applyReferenceLaborRates = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const currentRoles = await prisma.professionRole.findMany({
      where: { userId },
    });

    const blueprints = getReferenceRoleBlueprints();
    const operations = blueprints.map((blueprint) => {
      const aliases = [blueprint.name, ...getRoleAliases(blueprint.name), ...blueprint.aliases].map(normalize);
      const existingRole = currentRoles.find((role) => aliases.includes(normalize(role.name)));
      const { aliases: _aliases, ...roleData } = blueprint;

      if (existingRole) {
        return prisma.professionRole.update({
          where: { id: existingRole.id },
          data: {
            description: roleData.description,
            hourlyRate: roleData.hourlyRate ?? null,
            dailyRate: roleData.dailyRate ?? null,
            billingType: roleData.billingType,
            ratePerUnit: roleData.ratePerUnit ?? null,
            bocaRates: roleData.bocaRates || [],
          },
        });
      }

      return prisma.professionRole.create({
        data: {
          ...roleData,
          bocaRates: roleData.bocaRates || [],
          userId,
        },
      });
    });

    const appliedRoles = await prisma.$transaction(operations);

    res.json({
      message: 'Tarifas de referencia aplicadas',
      reference: {
        id: PUERTO_MADRYN_LABOR_REFERENCE.id,
        label: PUERTO_MADRYN_LABOR_REFERENCE.label,
        effectiveDate: PUERTO_MADRYN_LABOR_REFERENCE.effectiveDate,
        sourceSummary: PUERTO_MADRYN_LABOR_REFERENCE.sourceSummary,
        sourceUrls: PUERTO_MADRYN_LABOR_REFERENCE.sourceUrls,
      },
      roles: appliedRoles,
    });
  } catch (error) {
    console.error('Error al aplicar tarifas de referencia:', error);
    res.status(500).json({ error: 'Error al aplicar tarifas de referencia' });
  }
};
