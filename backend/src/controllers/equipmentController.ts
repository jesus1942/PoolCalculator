import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { generateEquipmentRecommendation } from '../utils/equipmentSelection';

/**
 * Obtiene recomendaciones de equipos basadas en el volumen de la piscina
 */
export const getEquipmentRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const {
      poolVolume,
      hasSkimmer = true,
      skimmerCount = 1,
      hasLighting = true,
      lightingCount = 2,
      returnsCount = 4,
      hasVacuumIntake = true,
      vacuumIntakeCount = 1,
      distanceToPanel = 0,
    } = req.query;

    if (!poolVolume) {
      return res.status(400).json({ error: 'poolVolume es requerido' });
    }

    const volume = parseFloat(poolVolume as string);

    if (isNaN(volume) || volume <= 0) {
      return res.status(400).json({ error: 'poolVolume debe ser un número válido mayor a 0' });
    }

    // Obtener todos los equipos disponibles
    const allEquipment = await prisma.equipmentPreset.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { type: 'asc' },
        { minPoolVolume: 'asc' },
      ],
    });

    const poolConfig = {
      hasSkimmer: hasSkimmer === 'true' || hasSkimmer === true,
      skimmerCount: parseInt(skimmerCount as string) || 1,
      hasLighting: hasLighting === 'true' || hasLighting === true,
      lightingCount: parseInt(lightingCount as string) || 2,
      returnsCount: parseInt(returnsCount as string) || 4,
      hasVacuumIntake: hasVacuumIntake === 'true' || hasVacuumIntake === true,
      vacuumIntakeCount: parseInt(vacuumIntakeCount as string) || 1,
    };

    const distance = parseFloat(distanceToPanel as string) || 0;

    // Generar recomendación
    const recommendation = generateEquipmentRecommendation(
      volume,
      poolConfig,
      allEquipment,
      distance
    );

    if (!recommendation) {
      return res.status(404).json({
        error: 'No se encontraron equipos adecuados para el volumen especificado',
      });
    }

    res.json(recommendation);
  } catch (error) {
    console.error('Error al obtener recomendaciones de equipos:', error);
    res.status(500).json({ error: 'Error al obtener recomendaciones de equipos' });
  }
};

/**
 * Obtiene todos los equipos disponibles filtrados por categoría/tipo
 */
export const getAllEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const { category, type, isActive } = req.query;

    const where: any = {};

    if (category) where.category = category;
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const equipment = await prisma.equipmentPreset.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { type: 'asc' },
        { minPoolVolume: 'asc' },
      ],
    });

    res.json(equipment);
  } catch (error) {
    console.error('Error al obtener equipos:', error);
    res.status(500).json({ error: 'Error al obtener equipos' });
  }
};

/**
 * Obtiene un equipo por ID
 */
export const getEquipmentById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const equipment = await prisma.equipmentPreset.findUnique({
      where: { id },
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Equipo no encontrado' });
    }

    res.json(equipment);
  } catch (error) {
    console.error('Error al obtener equipo:', error);
    res.status(500).json({ error: 'Error al obtener equipo' });
  }
};

/**
 * Crea un nuevo equipo (solo admin)
 */
export const createEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'No tienes permiso para crear equipos' });
    }

    const equipment = await prisma.equipmentPreset.create({
      data: req.body,
    });

    res.status(201).json(equipment);
  } catch (error) {
    console.error('Error al crear equipo:', error);
    res.status(500).json({ error: 'Error al crear equipo' });
  }
};

/**
 * Actualiza un equipo (solo admin)
 */
export const updateEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar equipos' });
    }

    const equipment = await prisma.equipmentPreset.update({
      where: { id },
      data: req.body,
    });

    res.json(equipment);
  } catch (error) {
    console.error('Error al actualizar equipo:', error);
    res.status(500).json({ error: 'Error al actualizar equipo' });
  }
};

/**
 * Elimina un equipo (solo admin) - soft delete
 */
export const deleteEquipment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPERADMIN';

    if (!isAdmin) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar equipos' });
    }

    // Soft delete - marcar como inactivo
    const equipment = await prisma.equipmentPreset.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Equipo desactivado exitosamente', equipment });
  } catch (error) {
    console.error('Error al eliminar equipo:', error);
    res.status(500).json({ error: 'Error al eliminar equipo' });
  }
};
