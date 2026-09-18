import { Request, Response } from 'express';
import prisma from '../config/database';
import { resolveProjectAccessProfile } from '../utils/projectAccess';
import { AuthRequest } from '../middleware/auth';

const projectUpdateDelegate = prisma.projectUpdate as any;

const updateAuthorSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

const mapUpdateAuthor = (createdBy?: { id: string; name: string | null; email: string | null; role: string } | null) => (
  createdBy
    ? {
        id: createdBy.id,
        name: createdBy.name,
        email: createdBy.email,
        role: createdBy.role,
      }
    : null
);

/** Todas las rutas de avance reutilizan la autorización del proyecto padre. */
const authorizeProject = async (req: AuthRequest, res: Response, projectId: string, write = false) => {
  if (!req.user?.userId) {
    res.status(401).json({ error: 'No autorizado' });
    return null;
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    res.status(404).json({ error: 'Proyecto no encontrado' });
    return null;
  }
  const access = await resolveProjectAccessProfile(project, req.user);
  if (!access.canAccess || (write && !access.canEdit)) {
    res.status(403).json({ error: 'No tenés permiso para este proyecto' });
    return null;
  }
  return access;
};

/** Resuelve el padre desde la base para impedir cambiar una actualización ajena por su ID. */
const authorizeUpdate = async (req: AuthRequest, res: Response, id: string, write = false) => {
  const update = await projectUpdateDelegate.findUnique({ where: { id } });
  if (!update) {
    res.status(404).json({ error: 'Actualización no encontrada' });
    return null;
  }
  return authorizeProject(req, res, update.projectId, write);
};

export const projectUpdateController = {
  // Obtener todas las actualizaciones de un proyecto
  async getByProject(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const access = await authorizeProject(req, res, projectId, false);
      if (!access) return;

      const updates = await projectUpdateDelegate.findMany({
        where: { projectId },
        include: {
          createdBy: { select: updateAuthorSelect },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(updates);
    } catch (error) {
      console.error('Error fetching project updates:', error);
      res.status(500).json({ error: 'Error al obtener actualizaciones del proyecto' });
    }
  },

  // Obtener timeline combinado (actualizaciones + agenda)
  async getTimeline(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const access = await authorizeProject(req, res, projectId, false);
      if (!access) return;

      const [updates, agendaEvents] = await Promise.all([
        projectUpdateDelegate.findMany({
          where: { projectId },
          include: {
            createdBy: { select: updateAuthorSelect },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.agendaEvent.findMany({
          where: { projectId },
          include: {
            messages: {
              ...(!['owner', 'admin'].includes(access.source) ? { where: { visibility: 'ALL' as const } } : {}),
              orderBy: { createdAt: 'asc' },
              include: {
                user: { select: { id: true, name: true, email: true, role: true } },
              },
            },
          },
          orderBy: { startAt: 'desc' },
        }),
      ]);

      const updateItems = updates.map((update: any) => ({
        id: update.id,
        type: 'PROJECT_UPDATE',
        createdAt: update.createdAt,
        title: update.title,
        description: update.description,
        category: update.category,
        images: update.images,
        isPublic: update.isPublic,
        author: mapUpdateAuthor(update.createdBy),
      }));

      const eventItems = agendaEvents.map((event) => ({
        id: `event-${event.id}`,
        type: 'AGENDA_EVENT',
        createdAt: event.startAt,
        title: event.title,
        description: event.location,
        event: {
          id: event.id,
          title: event.title,
          startAt: event.startAt,
          endAt: event.endAt,
          status: event.status,
          type: event.type,
          location: event.location,
        },
      }));

      const messageItems = agendaEvents.flatMap((event) =>
        event.messages.map((message) => ({
          id: `message-${message.id}`,
          type: 'AGENDA_MESSAGE',
          createdAt: message.createdAt,
          title: `Mensaje en ${event.title}`,
          description: message.body,
          images: message.images,
          message: {
            id: message.id,
            body: message.body,
            images: message.images,
            visibility: message.visibility,
            user: message.user,
          },
          event: {
            id: event.id,
            title: event.title,
            startAt: event.startAt,
            endAt: event.endAt,
            status: event.status,
            type: event.type,
            location: event.location,
          },
        }))
      );

      const timeline = [...updateItems, ...eventItems, ...messageItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      res.json({ updates, timeline });
    } catch (error) {
      console.error('Error fetching project timeline:', error);
      res.status(500).json({ error: 'Error al obtener timeline del proyecto' });
    }
  },

  // Crear una nueva actualización
  async create(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const access = await authorizeProject(req, res, projectId, true);
      if (!access) return;
      const userId = req.user?.userId || null;
      const { title, description, category, images, metadata } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'El título es obligatorio' });
      }

      const update = await projectUpdateDelegate.create({
        data: {
          projectId,
          title,
          description: description || null,
          category: category || 'PROGRESS',
          images: images || [],
          metadata: metadata || null,
          createdById: userId,
        },
        include: {
          createdBy: { select: updateAuthorSelect },
        },
      });

      res.status(201).json(update);
    } catch (error) {
      console.error('Error creating project update:', error);
      res.status(500).json({ error: 'Error al crear actualización' });
    }
  },

  // Actualizar una actualización existente
  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!await authorizeUpdate(req, res, id, true)) return;
      const { title, description, category, images, metadata } = req.body;

      const update = await projectUpdateDelegate.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(category && { category }),
          ...(images !== undefined && { images }),
          ...(metadata !== undefined && { metadata }),
        },
        include: {
          createdBy: { select: updateAuthorSelect },
        },
      });

      res.json(update);
    } catch (error) {
      console.error('Error updating project update:', error);
      res.status(500).json({ error: 'Error al actualizar' });
    }
  },

  // Eliminar una actualización
  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!await authorizeUpdate(req, res, id, true)) return;

      await projectUpdateDelegate.delete({
        where: { id },
      });

      res.json({ message: 'Actualización eliminada exitosamente' });
    } catch (error) {
      console.error('Error deleting project update:', error);
      res.status(500).json({ error: 'Error al eliminar actualización' });
    }
  },

  // Obtener una actualización específica
  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      if (!await authorizeUpdate(req, res, id, false)) return;

      const update = await projectUpdateDelegate.findUnique({
        where: { id },
        include: {
          createdBy: { select: updateAuthorSelect },
        },
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
