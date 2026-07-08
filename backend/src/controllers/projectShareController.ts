import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { buildProjectCommercialProfile } from '../utils/projectCommercialProfile';
import { resolveProjectAccessProfile } from '../utils/projectAccess';

const getActor = (req: Request) => ({
  userId: req.user?.userId,
  role: req.user?.role,
  orgId: req.user?.orgId,
});

// Devuelve el proyecto solo si el usuario autenticado puede editarlo
// (dueño, admin de plataforma o acceso explícito con edición).
const findManagedProject = async (req: Request, projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return null;

  const access = await resolveProjectAccessProfile(project, getActor(req));
  if (!access.canAccess || !access.canEdit) return null;

  return project;
};

const findActiveShareByToken = async (shareToken: string) =>
  prisma.projectShare.findUnique({ where: { shareToken } });

const shareIsExpired = (share: { expiresAt: Date | null }) =>
  Boolean(share.expiresAt && new Date(share.expiresAt) < new Date());

const CLIENT_COMMENT_KINDS = ['COMMENT', 'PRAISE', 'SUGGESTION', 'QUESTION'] as const;

// Crear o actualizar link compartido
export const createOrUpdateShare = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { showCosts, showDetails, expiresAt, clientUsername, clientPassword } = req.body;

    const project = await findManagedProject(req, projectId);
    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    // Buscar si ya existe un share
    let projectShare = await prisma.projectShare.findUnique({
      where: { projectId },
    });

    if (projectShare) {
      // Actualizar existente
      const updateData: any = {
        showCosts: showCosts !== undefined ? showCosts : projectShare.showCosts,
        showDetails: showDetails !== undefined ? showDetails : projectShare.showDetails,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : projectShare.expiresAt,
        isActive: true,
      };

      // Solo actualizar credenciales si se proporcionan
      if (clientUsername) updateData.clientUsername = clientUsername;
      if (clientPassword) updateData.clientPassword = await bcrypt.hash(clientPassword, 10);

      projectShare = await prisma.projectShare.update({
        where: { id: projectShare.id },
        data: updateData,
      });
    } else {
      // Crear nuevo - requiere username y password
      if (!clientUsername || !clientPassword) {
        return res.status(400).json({ error: 'Se requiere usuario y contraseña para el cliente' });
      }

      // Verificar que el username no esté en uso
      const existingShare = await prisma.projectShare.findUnique({
        where: { clientUsername },
      });

      if (existingShare) {
        return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso' });
      }

      const hashedPassword = await bcrypt.hash(clientPassword, 10);

      projectShare = await prisma.projectShare.create({
        data: {
          projectId,
          clientUsername,
          clientPassword: hashedPassword,
          showCosts: showCosts || false,
          showDetails: showDetails !== undefined ? showDetails : true,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      });
    }

    // No devolver la contraseña
    const { clientPassword: _, ...shareData } = projectShare;
    res.json(shareData);
  } catch (error) {
    console.error('Error al crear/actualizar share:', error);
    res.status(500).json({ error: 'Error al crear link compartido' });
  }
};

// Obtener configuración de share
export const getShareConfig = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await findManagedProject(req, projectId);
    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const projectShare = await prisma.projectShare.findUnique({
      where: { projectId },
    });

    res.json(projectShare);
  } catch (error) {
    console.error('Error al obtener share:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

// Desactivar share
export const deactivateShare = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await findManagedProject(req, projectId);
    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    await prisma.projectShare.update({
      where: { projectId },
      data: { isActive: false },
    });

    res.json({ message: 'Link desactivado' });
  } catch (error) {
    console.error('Error al desactivar share:', error);
    res.status(500).json({ error: 'Error al desactivar link' });
  }
};

// Login de cliente para timeline público
export const clientLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const projectShare = await prisma.projectShare.findUnique({
      where: { clientUsername: username },
      include: {
        project: true,
      },
    });

    if (!projectShare || !projectShare.isActive) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar si el link expiró
    if (projectShare.expiresAt && new Date(projectShare.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Acceso expirado' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, projectShare.clientPassword);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Devolver token de share para acceder al timeline
    res.json({
      shareToken: projectShare.shareToken,
      projectName: projectShare.project.name,
    });
  } catch (error) {
    console.error('Error en login de cliente:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

// Obtener timeline público (requiere shareToken)
export const getPublicTimeline = async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    const projectShare = await prisma.projectShare.findUnique({
      where: { shareToken },
      include: {
        project: {
          include: {
            projectUpdates: {
              where: { isPublic: true },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                projectId: true,
                title: true,
                description: true,
                category: true,
                images: true,
                metadata: true,
                isPublic: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!projectShare || !projectShare.isActive) {
      return res.status(404).json({ error: 'Link no válido o expirado' });
    }

    // Verificar si el link expiró
    if (projectShare.expiresAt && new Date(projectShare.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Link expirado' });
    }

    const timeline = projectShare.project.projectUpdates
      .map((update) => ({
        id: update.id,
        type: 'PROJECT_UPDATE',
        createdAt: update.createdAt,
        title: update.title,
        description: update.description,
        category: update.category,
        images: update.images,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const comments = await prisma.projectClientComment.findMany({
      where: { projectId: projectShare.project.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        authorName: true,
        kind: true,
        body: true,
        reply: true,
        repliedAt: true,
        createdAt: true,
      },
    });

    // Preparar datos a enviar
    const response = {
      project: {
        id: projectShare.project.id,
        name: projectShare.project.name,
        clientName: projectShare.project.clientName,
        status: projectShare.project.status,
        createdAt: projectShare.project.createdAt,
        commercialProfile: buildProjectCommercialProfile(projectShare.project as any),
      },
      updates: projectShare.project.projectUpdates,
      timeline,
      comments,
      config: {
        showCosts: projectShare.showCosts,
        showDetails: projectShare.showDetails,
      },
    };

    // Agregar costos si está habilitado
    if (projectShare.showCosts) {
      (response.project as any).totalCost = projectShare.project.totalCost;
      (response.project as any).materialCost = projectShare.project.materialCost;
      (response.project as any).laborCost = projectShare.project.laborCost;
    }

    res.json(response);
  } catch (error) {
    console.error('Error al obtener timeline público:', error);
    res.status(500).json({ error: 'Error al cargar timeline' });
  }
};

const escapeCsv = (value: any) => {
  if (value === null || value === undefined) return '';
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const exportPublicTimeline = async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    const projectShare = await prisma.projectShare.findUnique({
      where: { shareToken },
      include: {
        project: {
          include: {
            projectUpdates: {
              where: { isPublic: true },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                projectId: true,
                title: true,
                description: true,
                category: true,
                images: true,
                metadata: true,
                isPublic: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });

    if (!projectShare || !projectShare.isActive) {
      return res.status(404).json({ error: 'Link no válido o expirado' });
    }

    if (projectShare.expiresAt && new Date(projectShare.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Link expirado' });
    }

    const timeline = projectShare.project.projectUpdates
      .map((update) => ({
        type: 'PROJECT_UPDATE',
        createdAt: update.createdAt,
        title: update.title,
        description: update.description,
        category: update.category,
        eventStartAt: '',
        eventEndAt: '',
        location: '',
        messageBody: '',
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const header = [
      'Tipo',
      'Fecha',
      'Titulo',
      'Descripcion',
      'Categoria',
      'Evento Inicio',
      'Evento Fin',
      'Ubicacion',
      'Mensaje',
    ];

    const rows = timeline.map((item) => [
      escapeCsv(item.type),
      escapeCsv(new Date(item.createdAt).toLocaleString('es-AR')),
      escapeCsv(item.title),
      escapeCsv(item.description),
      escapeCsv(item.category),
      escapeCsv(item.eventStartAt ? new Date(item.eventStartAt).toLocaleString('es-AR') : ''),
      escapeCsv(item.eventEndAt ? new Date(item.eventEndAt).toLocaleString('es-AR') : ''),
      escapeCsv(item.location),
      escapeCsv(item.messageBody),
    ]);

    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const safeName = projectShare.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="timeline-${safeName || 'proyecto'}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error al exportar timeline público:', error);
    res.status(500).json({ error: 'Error al exportar timeline' });
  }
};

// Actualizar visibilidad de una actualización
export const toggleUpdateVisibility = async (req: Request, res: Response) => {
  try {
    const { updateId } = req.params;
    const { isPublic } = req.body;

    // Verificar que la actualización pertenece a un proyecto que el usuario puede editar
    const update = await prisma.projectUpdate.findUnique({
      where: { id: updateId },
      include: { project: true },
    });

    if (!update) {
      return res.status(404).json({ error: 'Actualización no encontrada' });
    }

    const access = await resolveProjectAccessProfile(update.project, getActor(req));
    if (!access.canAccess || !access.canEdit) {
      return res.status(404).json({ error: 'Actualización no encontrada' });
    }

    // Si no llega un booleano explícito, alterna el estado actual
    const nextIsPublic = typeof isPublic === 'boolean' ? isPublic : !update.isPublic;

    const updatedUpdate = await prisma.projectUpdate.update({
      where: { id: updateId },
      data: { isPublic: nextIsPublic },
    });

    res.json(updatedUpdate);
  } catch (error) {
    console.error('Error al actualizar visibilidad:', error);
    res.status(500).json({ error: 'Error al actualizar visibilidad' });
  }
};

// ============================================================
// Comentarios del cliente sobre el timeline compartido
// ============================================================

// El cliente (autenticado por shareToken) deja un comentario:
// felicitación, crítica constructiva o consulta.
export const createPublicComment = async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;
    const { body, kind, authorName } = req.body || {};

    const projectShare = await findActiveShareByToken(shareToken);
    if (!projectShare || !projectShare.isActive) {
      return res.status(404).json({ error: 'Link no válido o expirado' });
    }
    if (shareIsExpired(projectShare)) {
      return res.status(410).json({ error: 'Link expirado' });
    }

    const text = typeof body === 'string' ? body.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'El comentario es demasiado largo (máximo 2000 caracteres)' });
    }

    const commentKind = CLIENT_COMMENT_KINDS.includes(kind) ? kind : 'COMMENT';

    const project = await prisma.project.findUnique({
      where: { id: projectShare.projectId },
      select: { clientName: true },
    });

    const name = (typeof authorName === 'string' && authorName.trim())
      ? authorName.trim().slice(0, 120)
      : (project?.clientName || 'Cliente');

    const comment = await prisma.projectClientComment.create({
      data: {
        projectId: projectShare.projectId,
        authorName: name,
        kind: commentKind,
        body: text,
      },
      select: {
        id: true,
        authorName: true,
        kind: true,
        body: true,
        reply: true,
        repliedAt: true,
        createdAt: true,
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error al crear comentario del cliente:', error);
    res.status(500).json({ error: 'Error al enviar el comentario' });
  }
};

// Listado público de comentarios (para refrescar sin recargar el timeline)
export const listPublicComments = async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    const projectShare = await findActiveShareByToken(shareToken);
    if (!projectShare || !projectShare.isActive) {
      return res.status(404).json({ error: 'Link no válido o expirado' });
    }
    if (shareIsExpired(projectShare)) {
      return res.status(410).json({ error: 'Link expirado' });
    }

    const comments = await prisma.projectClientComment.findMany({
      where: { projectId: projectShare.projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        authorName: true,
        kind: true,
        body: true,
        reply: true,
        repliedAt: true,
        createdAt: true,
      },
    });

    res.json(comments);
  } catch (error) {
    console.error('Error al listar comentarios públicos:', error);
    res.status(500).json({ error: 'Error al cargar comentarios' });
  }
};

// El tenant lista los comentarios de su proyecto
export const listProjectComments = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await findManagedProject(req, projectId);
    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    const comments = await prisma.projectClientComment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(comments);
  } catch (error) {
    console.error('Error al listar comentarios del proyecto:', error);
    res.status(500).json({ error: 'Error al cargar comentarios' });
  }
};

// El tenant responde un comentario del cliente
export const replyToClientComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const { reply } = req.body || {};

    const comment = await prisma.projectClientComment.findUnique({
      where: { id: commentId },
      include: { project: true },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    const access = await resolveProjectAccessProfile(comment.project, getActor(req));
    if (!access.canAccess || !access.canEdit) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    const text = typeof reply === 'string' ? reply.trim() : '';
    if (!text) {
      return res.status(400).json({ error: 'La respuesta no puede estar vacía' });
    }
    if (text.length > 2000) {
      return res.status(400).json({ error: 'La respuesta es demasiado larga (máximo 2000 caracteres)' });
    }

    const updated = await prisma.projectClientComment.update({
      where: { id: commentId },
      data: {
        reply: text,
        repliedAt: new Date(),
        repliedById: req.user?.userId || null,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error al responder comentario:', error);
    res.status(500).json({ error: 'Error al responder el comentario' });
  }
};

// El tenant elimina un comentario (moderación)
export const deleteClientComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.projectClientComment.findUnique({
      where: { id: commentId },
      include: { project: true },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    const access = await resolveProjectAccessProfile(comment.project, getActor(req));
    if (!access.canAccess || !access.canEdit) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    await prisma.projectClientComment.delete({ where: { id: commentId } });

    res.json({ message: 'Comentario eliminado' });
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    res.status(500).json({ error: 'Error al eliminar el comentario' });
  }
};
