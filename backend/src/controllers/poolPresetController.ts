import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { calculatePerimeter, calculateWaterMirrorArea, calculateVolume } from '../utils/calculations';
import path from 'path';
import fs from 'fs';

// Mapeo de modelos con sus imágenes (sincronizado con update-pool-images.js)
const modelImageMapping: { [key: string]: string } = {
  'Jacuzzi': 'acquam-page-03.png',
  'Topacio': 'acquam-page-04.png',
  'Cuarzo': 'acquam-page-05.png',
  'Tanzanita': 'acquam-page-06.png',
  'Jaspe': 'acquam-page-07.png',
  'Circón': 'acquam-page-08.png',
  'Ambar': 'acquam-page-09.png',
  'Amatista': 'acquam-page-10.png',
  'Turquesa': 'acquam-page-11.png',
  'Turmalina': 'acquam-page-12.png',
  'Gema Azul': 'acquam-page-13.png',
  'Ópalo': 'acquam-page-14.png',
  'Agua Marina': 'acquam-page-15.png',
  'Ágata': 'acquam-page-16.png',
  'Zafiro Azul': 'acquam-page-17.png',
  'Onix': 'acquam-page-18.png',
  'Zafiro': 'acquam-page-19.png',
  'Espinela': 'acquam-page-20.png',
  'Aventurina': 'acquam-page-21.png',
  'Alejandrita': 'acquam-page-22.png',
  'Diamante Rojo': 'acquam-page-23.png',
  'Kriptonita': 'acquam-page-25.png',
  'Coral': 'acquam-page-26.png',
  'Jade': 'acquam-page-27.png',
  'Cuarzo Rosa': 'Cuarzo Rosa.png'
};

// Función helper para parsear datos del FormData
const parseFormData = (body: any) => {
  const parsed: any = {};
  
  for (const key in body) {
    const value = body[key];
    
    // Números
    if (['length', 'width', 'depth', 'depthEnd', 'lateralCushionSpace', 'floorCushionDepth', 
         'returnsCount', 'hydroJetsCount', 'vacuumIntakeCount', 'skimmerCount', 'lightingCount'].includes(key)) {
      parsed[key] = value ? parseFloat(value) : 0;
    }
    // Booleanos
    else if (['hasWetDeck', 'hasStairsOnly', 'hasHotWaterReturn', 'hasHydroJets', 
              'hasBottomDrain', 'hasVacuumIntake', 'hasSkimmer', 'hasLighting'].includes(key)) {
      parsed[key] = value === 'true' || value === true;
    }
    // Strings normales
    else {
      parsed[key] = value;
    }
  }
  
  return parsed;
};

export const createPoolPreset = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const data = parseFormData({ ...req.body, userId });

    // Manejar imagen principal
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files?.image?.[0]) {
      data.imageUrl = `/uploads/${files.image[0].filename}`;
    }
    // Si no, buscar automáticamente en el catálogo
    else if (data.name && modelImageMapping[data.name]) {
      data.imageUrl = `/pool-images/${modelImageMapping[data.name]}`;
      console.log(`🖼️  Imagen automática asignada: ${data.name} -> ${data.imageUrl}`);
    }

    // Manejar imágenes adicionales
    if (files?.additionalImages && files.additionalImages.length > 0) {
      data.additionalImages = files.additionalImages.map(file => `/uploads/${file.filename}`);
    }

    const poolPreset = await prisma.poolPreset.create({ data });

    res.status(201).json(poolPreset);
  } catch (error) {
    console.error('Error al crear modelo:', error);
    res.status(500).json({ error: 'Error al crear modelo de piscina' });
  }
};

export const getPoolPresets = async (req: AuthRequest, res: Response) => {
  try {
    const poolPresets = await prisma.poolPreset.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(poolPresets);
  } catch (error) {
    console.error('Error al obtener modelos:', error);
    res.status(500).json({ error: 'Error al obtener modelos' });
  }
};

export const getPoolPresetById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const poolPreset = await prisma.poolPreset.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!poolPreset) {
      return res.status(404).json({ error: 'Modelo no encontrado' });
    }

    res.json(poolPreset);
  } catch (error) {
    console.error('Error al obtener modelo:', error);
    res.status(500).json({ error: 'Error al obtener modelo' });
  }
};

export const updatePoolPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const existingPreset = await prisma.poolPreset.findUnique({
      where: { id },
    });

    if (!existingPreset) {
      return res.status(404).json({ error: 'Modelo no encontrado' });
    }

    if (existingPreset.userId !== userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'No tenés permiso para modificar este modelo' });
    }

    const data = parseFormData(req.body);

    // Eliminar campos que no son parte del modelo Prisma
    delete data.existingAdditionalImages;

    // Manejar imagen principal
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files?.image?.[0]) {
      // Eliminar imagen anterior si existe y es de uploads
      if (existingPreset.imageUrl?.startsWith('/uploads/')) {
        const oldImagePath = path.join(__dirname, '../../', existingPreset.imageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      data.imageUrl = `/uploads/${files.image[0].filename}`;
    }

    // Manejar imágenes adicionales
    // Obtener lista de URLs existentes que el frontend quiere mantener
    const existingImagesToKeep = req.body.existingAdditionalImages
      ? (typeof req.body.existingAdditionalImages === 'string'
          ? JSON.parse(req.body.existingAdditionalImages)
          : req.body.existingAdditionalImages)
      : [];

    // Empezar con las imágenes existentes que se quieren mantener
    let updatedAdditionalImages: string[] = Array.isArray(existingImagesToKeep) ? existingImagesToKeep : [];

    // Eliminar imágenes que ya no se quieren (no están en la lista de mantener)
    if (existingPreset.additionalImages && existingPreset.additionalImages.length > 0) {
      existingPreset.additionalImages.forEach((imgUrl: string) => {
        if (!updatedAdditionalImages.includes(imgUrl) && imgUrl.startsWith('/uploads/')) {
          const oldImagePath = path.join(__dirname, '../../', imgUrl);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
            console.log(`🗑️  Imagen eliminada: ${imgUrl}`);
          }
        }
      });
    }

    // Agregar nuevas imágenes al final
    if (files?.additionalImages && files.additionalImages.length > 0) {
      const newImageUrls = files.additionalImages.map(file => `/uploads/${file.filename}`);
      updatedAdditionalImages = [...updatedAdditionalImages, ...newImageUrls];
      console.log(`📸 Nuevas imágenes agregadas: ${newImageUrls.length}`);
    }

    // Solo actualizar si hay cambios
    if (updatedAdditionalImages.length > 0 || existingPreset.additionalImages?.length > 0) {
      data.additionalImages = updatedAdditionalImages;
    }

    const poolPreset = await prisma.poolPreset.update({
      where: { id },
      data,
    });

    res.json(poolPreset);
  } catch (error) {
    console.error('Error al actualizar modelo:', error);
    res.status(500).json({ error: 'Error al actualizar modelo' });
  }
};

export const deletePoolPreset = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const existingPreset = await prisma.poolPreset.findUnique({
      where: { id },
    });

    if (!existingPreset) {
      return res.status(404).json({ error: 'Modelo no encontrado' });
    }

    if (existingPreset.userId !== userId && req.user?.role !== 'ADMIN' && req.user?.role !== 'SUPERADMIN') {
      return res.status(403).json({ error: 'No tenés permiso para eliminar este modelo' });
    }

    // Eliminar imagen principal si existe y es de uploads
    if (existingPreset.imageUrl?.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '../../', existingPreset.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Eliminar imágenes adicionales si existen
    if (existingPreset.additionalImages && existingPreset.additionalImages.length > 0) {
      existingPreset.additionalImages.forEach((imgUrl: string) => {
        if (imgUrl.startsWith('/uploads/')) {
          const imgPath = path.join(__dirname, '../../', imgUrl);
          if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
          }
        }
      });
    }

    await prisma.poolPreset.delete({
      where: { id },
    });

    res.json({ message: 'Modelo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar modelo:', error);
    res.status(500).json({ error: 'Error al eliminar modelo' });
  }
};

export const calculatePresetMeasurements = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const preset = await prisma.poolPreset.findUnique({
      where: { id },
    });

    if (!preset) {
      return res.status(404).json({ error: 'Modelo no encontrado' });
    }

    const dimensions = {
      length: preset.length,
      width: preset.width,
      depth: preset.depth,
      depthEnd: preset.depthEnd || undefined,
      shape: preset.shape,
    };

    const perimeter = calculatePerimeter(dimensions);
    const waterMirrorArea = calculateWaterMirrorArea(dimensions);
    const volume = calculateVolume(dimensions);

    res.json({
      perimeter: parseFloat(perimeter.toFixed(2)),
      waterMirrorArea: parseFloat(waterMirrorArea.toFixed(2)),
      volume: parseFloat(volume.toFixed(2)),
      volumeInLiters: parseFloat((volume * 1000).toFixed(2)),
    });
  } catch (error) {
    console.error('Error al calcular medidas:', error);
    res.status(500).json({ error: 'Error al calcular medidas' });
  }
};
