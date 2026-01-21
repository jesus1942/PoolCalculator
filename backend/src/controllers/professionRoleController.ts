import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

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

// Roles predefinidos
const DEFAULT_ROLES = [
  { name: 'Albañil', description: 'Construcción de estructura y mampostería' },
  { name: 'Sanitarista', description: 'Instalación de cañerías y sistemas de agua' },
  { name: 'Electricista', description: 'Instalación eléctrica y iluminación' },
  { name: 'Colocador de Losetas', description: 'Instalación de revestimientos' },
  { name: 'Excavador', description: 'Movimiento de suelos y excavación' },
  { name: 'Instalador de Equipos', description: 'Instalación de bombas y filtros' },
  { name: 'Pintor', description: 'Pintura y acabados' },
  { name: 'Gasista', description: 'Instalación de gas para calefacción' },
];

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
