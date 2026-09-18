import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

export const getCalculationSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    let settings = await prisma.calculationSettings.findUnique({
      where: { userId },
    });

    // Si no existe, crear con valores por defecto
    if (!settings) {
      settings = await prisma.calculationSettings.create({
        data: { userId },
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

export const updateCalculationSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Parsear valores numéricos y filtrar campos no actualizables
    const data: any = {};
    const editableFields = new Set([
      'adhesiveKgPerM2', 'sidewalkBaseThicknessCm', 'cementKgPerM3', 'sandM3PerM3',
      'gravelM3PerM3', 'groutJointWidthMm', 'whiteCementKgPerLinealM', 'marmolinaKgPerLinealM',
      'wireMeshOverlapCm', 'wireMeshM2PerM2', 'waterproofingKgPerM2', 'waterproofingCoats',
      'tileInstallerRatePerM2', 'excavationRatePerM3', 'finishingRatePerM2',
      'groutWhiteCementParts', 'groutMarmolinaParts', 'bedThicknessCm', 'bedCementKgPerM3',
      'bedCementBagsPerM3', 'bedCementBagWeight', 'bedSandM3PerCementBag',
      'drainTrenchWidthCm', 'drainTrenchDepthCm', 'geomembraneM2PerM2', 'electroweldedMeshM2PerM2',
    ]);

    for (const key of Object.keys(req.body)) {
      // Saltar campos que no deben ser actualizados
      if (!editableFields.has(key)) {
        continue;
      }

      const value = req.body[key];
      if (key === 'waterproofingCoats') {
        data[key] = parseInt(value);
      } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
        data[key] = parseFloat(value);
      } else {
        data[key] = value;
      }
    }

    const settings = await prisma.calculationSettings.upsert({
      where: { userId },
      update: data,
      create: {
        ...data,
        userId,
      },
    });

    res.json(settings);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};
