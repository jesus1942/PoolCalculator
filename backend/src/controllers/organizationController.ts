import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { generateToken } from '../config/jwt';
import bcrypt from 'bcryptjs';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ensureOwnerUser = async (email: string, name?: string, password?: string) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  if (!name || !password) {
    throw new Error('ownerName y ownerPassword son requeridos para crear el owner');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
};

export const listOrganizations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentOrgId: true },
    });

    res.json({
      currentOrgId: user?.currentOrgId || null,
      organizations: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
      })),
    });
  } catch (error) {
    console.error('Error al listar organizaciones:', error);
    res.status(500).json({ error: 'Error al listar organizaciones' });
  }
};

export const switchOrganization = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'No autorizado' });

    const { organizationId } = req.body;
    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId requerido' });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: {
        organization: true,
        user: true,
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'No sos miembro de esta organización' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { currentOrgId: organizationId },
    });

    const token = generateToken(membership.user.id, membership.user.email, membership.user.role, organizationId);

    res.json({
      message: 'Organización actualizada',
      token,
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
        role: membership.user.role,
        currentOrgId: organizationId,
      },
    });
  } catch (error) {
    console.error('Error al cambiar organización:', error);
    res.status(500).json({ error: 'Error al cambiar organización' });
  }
};

export const listAllOrganizations = async (_req: AuthRequest, res: Response) => {
  try {
    const organizations = await prisma.organization.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(
      organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        owner: org.owner,
        membersCount: org._count.members,
        createdAt: org.createdAt,
      })),
    );
  } catch (error) {
    console.error('Error al listar organizaciones:', error);
    res.status(500).json({ error: 'Error al listar organizaciones' });
  }
};

export const createOrganization = async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, ownerEmail, ownerName, ownerPassword } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }

    const resolvedSlug = slug || slugify(name);
    if (resolvedSlug) {
      const existing = await prisma.organization.findUnique({ where: { slug: resolvedSlug } });
      if (existing) {
        return res.status(400).json({ error: 'Slug ya existe' });
      }
    }

    let ownerId: string | null = null;
    if (ownerEmail) {
      const ownerUser = await ensureOwnerUser(ownerEmail, ownerName, ownerPassword);
      ownerId = ownerUser.id;
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug: resolvedSlug || null,
        ownerId,
      },
    });

    if (ownerId) {
      await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: ownerId,
          },
        },
        create: {
          organizationId: organization.id,
          userId: ownerId,
          role: 'ADMIN',
        },
        update: { role: 'ADMIN' },
      });

      await prisma.user.update({
        where: { id: ownerId },
        data: { currentOrgId: organization.id, role: 'ADMIN' },
      });
    }

    res.json({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      ownerId,
    });
  } catch (error: any) {
    console.error('Error al crear organización:', error);
    res.status(500).json({ error: error.message || 'Error al crear organización' });
  }
};

export const updateOrganization = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug, ownerEmail } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'ID requerido' });
    }

    let ownerId: string | null | undefined = undefined;
    if (ownerEmail) {
      const owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
      if (!owner) {
        return res.status(404).json({ error: 'Owner no encontrado' });
      }
      ownerId = owner.id;
    }

    if (slug) {
      const existing = await prisma.organization.findUnique({ where: { slug } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'Slug ya existe' });
      }
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        name: name ?? undefined,
        slug: slug ?? undefined,
        ownerId: ownerId ?? undefined,
      },
    });

    if (ownerId) {
      await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: ownerId,
          },
        },
        create: {
          organizationId: organization.id,
          userId: ownerId,
          role: 'ADMIN',
        },
        update: { role: 'ADMIN' },
      });
    }

    res.json({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      ownerId: organization.ownerId,
    });
  } catch (error) {
    console.error('Error al actualizar organización:', error);
    res.status(500).json({ error: 'Error al actualizar organización' });
  }
};
