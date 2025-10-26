import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';

// Crear o actualizar link compartido
export const createOrUpdateShare = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { showCosts, showDetails, expiresAt, clientUsername, clientPassword } = req.body;
    const userId = (req as any).userId;

    // Verificar que el proyecto pertenece al usuario
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

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
    const userId = (req as any).userId;

    // Verificar que el proyecto pertenece al usuario
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

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
    const userId = (req as any).userId;

    // Verificar que el proyecto pertenece al usuario
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

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

    // Preparar datos a enviar
    const response = {
      project: {
        id: projectShare.project.id,
        name: projectShare.project.name,
        clientName: projectShare.project.clientName,
        status: projectShare.project.status,
        createdAt: projectShare.project.createdAt,
      },
      updates: projectShare.project.projectUpdates,
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

// Actualizar visibilidad de una actualización
export const toggleUpdateVisibility = async (req: Request, res: Response) => {
  try {
    const { updateId } = req.params;
    const { isPublic } = req.body;
    const userId = (req as any).userId;

    // Verificar que la actualización pertenece a un proyecto del usuario
    const update = await prisma.projectUpdate.findUnique({
      where: { id: updateId },
      include: { project: true },
    });

    if (!update || update.project.userId !== userId) {
      return res.status(404).json({ error: 'Actualización no encontrada' });
    }

    const updatedUpdate = await prisma.projectUpdate.update({
      where: { id: updateId },
      data: { isPublic },
    });

    res.json(updatedUpdate);
  } catch (error) {
    console.error('Error al actualizar visibilidad:', error);
    res.status(500).json({ error: 'Error al actualizar visibilidad' });
  }
};
