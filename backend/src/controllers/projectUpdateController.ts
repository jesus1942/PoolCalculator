import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const projectUpdateController = {
  // Obtener todas las actualizaciones de un proyecto
  async getByProject(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      const updates = await prisma.projectUpdate.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      });

      res.json(updates);
    } catch (error) {
      console.error('Error fetching project updates:', error);
      res.status(500).json({ error: 'Error al obtener actualizaciones del proyecto' });
    }
  },

  // Crear una nueva actualización
  async create(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { title, description, category, images, metadata } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'El título es obligatorio' });
      }

      const update = await prisma.projectUpdate.create({
        data: {
          projectId,
          title,
          description: description || null,
          category: category || 'PROGRESS',
          images: images || [],
          metadata: metadata || null,
        },
      });

      res.status(201).json(update);
    } catch (error) {
      console.error('Error creating project update:', error);
      res.status(500).json({ error: 'Error al crear actualización' });
    }
  },

  // Actualizar una actualización existente
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, category, images, metadata } = req.body;

      const update = await prisma.projectUpdate.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(category && { category }),
          ...(images !== undefined && { images }),
          ...(metadata !== undefined && { metadata }),
        },
      });

      res.json(update);
    } catch (error) {
      console.error('Error updating project update:', error);
      res.status(500).json({ error: 'Error al actualizar' });
    }
  },

  // Eliminar una actualización
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.projectUpdate.delete({
        where: { id },
      });

      res.json({ message: 'Actualización eliminada exitosamente' });
    } catch (error) {
      console.error('Error deleting project update:', error);
      res.status(500).json({ error: 'Error al eliminar actualización' });
    }
  },

  // Obtener una actualización específica
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const update = await prisma.projectUpdate.findUnique({
        where: { id },
      });

      if (!update) {
        return res.status(404).json({ error: 'Actualización no encontrada' });
      }

      res.json(update);
    } catch (error) {
      console.error('Error fetching project update:', error);
      res.status(500).json({ error: 'Error al obtener actualización' });
    }
  },
};
