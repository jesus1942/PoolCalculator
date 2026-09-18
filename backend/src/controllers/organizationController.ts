import { Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { generateToken } from '../config/jwt';
import bcrypt from 'bcryptjs';
import { normalizeEmail, validName, validNewPassword, PASSWORD_REQUIREMENTS } from '../utils/authValidation';
import { getSessionRole } from '../utils/authOrganization';

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ensureOwnerUser = async (tx: Prisma.TransactionClient, email: string, name?: string, password?: string) => {
  const existing = await tx.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (existing) {
    return existing;
  }

  if (!name || !password) {
    throw new Error('ownerName y ownerPassword son requeridos para crear el owner');
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  return tx.user.create({
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

    const membershipItems = memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
    }));

    // El superadmin (proveedor del SaaS) opera sobre cualquier tenant aunque
    // no sea miembro: el selector le muestra todas las organizaciones.
    if (req.user?.role === 'SUPERADMIN') {
      const allOrganizations = await prisma.organization.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: 'asc' },
      });
      const membershipRoleByOrgId = new Map(memberships.map((membership) => [membership.organizationId, membership.role as string]));
      return res.json({
        currentOrgId: user?.currentOrgId || null,
        organizations: allOrganizations.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          role: membershipRoleByOrgId.get(org.id) || 'SUPERADMIN',
        })),
      });
    }

    res.json({
      currentOrgId: user?.currentOrgId || null,
      organizations: membershipItems,
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
    if (typeof organizationId !== 'string' || !organizationId) {
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

    // El superadmin puede pararse en cualquier organización sin membresía
    // (no se lo agrega como miembro: opera como proveedor del SaaS).
    const isSuperadminUser = req.user?.role === 'SUPERADMIN';
    if (!membership && !isSuperadminUser) {
      return res.status(403).json({ error: 'No sos miembro de esta organización' });
    }

    let targetUser = membership?.user || null;
    if (!targetUser) {
      const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!organization) {
        return res.status(404).json({ error: 'Organización no encontrada' });
      }
      targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { currentOrgId: organizationId },
    });

    const role = await getSessionRole(targetUser.id, targetUser.role, organizationId);
    const token = generateToken(targetUser.id, targetUser.email, role, organizationId, targetUser.name, targetUser.sessionVersion);

    res.json({
      message: 'Organización actualizada',
      token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role,
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
    const { name, slug, ownerName, ownerPassword } = req.body || {};
    const ownerEmail = req.body?.ownerEmail ? normalizeEmail(req.body.ownerEmail) : null;
    if ((req.body?.ownerEmail && !ownerEmail) || (ownerPassword !== undefined && !validNewPassword(ownerPassword))) {
      return res.status(400).json({ error: 'Email inválido. ' + PASSWORD_REQUIREMENTS });
    }
    if (!validName(name) || (ownerName !== undefined && !validName(ownerName)) || (slug !== undefined && (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)))) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }

    const resolvedSlug = slug || slugify(name);
    if (resolvedSlug) {
      const existing = await prisma.organization.findUnique({ where: { slug: resolvedSlug } });
      if (existing) {
        return res.status(400).json({ error: 'Slug ya existe' });
      }
    }

    if (ownerEmail && (!ownerName || !ownerPassword)) {
      const existingOwner = await prisma.user.findFirst({ where: { email: { equals: ownerEmail, mode: 'insensitive' } }, select: { id: true } });
      if (!existingOwner) return res.status(400).json({ error: 'Nombre y contraseña requeridos para un propietario nuevo' });
    }
    const organization = await prisma.$transaction(async (tx) => {
      const ownerUser = ownerEmail ? await ensureOwnerUser(tx, ownerEmail, ownerName, ownerPassword) : null;
      const created = await tx.organization.create({
        data: {
          name: name.trim(), slug: resolvedSlug || null, ownerId: ownerUser?.id || null,
          ...(ownerUser ? { members: { create: { userId: ownerUser.id, role: 'OWNER' } } } : {}),
        },
      });
      if (ownerUser) {
        await tx.user.update({ where: { id: ownerUser.id }, data: { currentOrgId: created.id } });
      }
      return created;
    });

    res.json({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      ownerId: organization.ownerId,
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'La organización o el email ya existen' });
    }
    console.error('Error al crear organización:', error);
    res.status(500).json({ error: 'Error al crear organización' });
  }
};

export const updateOrganization = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, slug } = req.body || {};
    const ownerEmail = req.body?.ownerEmail ? normalizeEmail(req.body.ownerEmail) : null;
    if ((req.body?.ownerEmail && !ownerEmail) || (name !== undefined && !validName(name)) || (slug !== undefined && (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)))) {
      return res.status(400).json({ error: 'Nombre, slug o email inválidos' });
    }
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

    const organization = await prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: { name: name?.trim(), slug: slug ?? undefined, ownerId: ownerId ?? undefined },
      });
      if (ownerId) {
        // Mantiene un solo OWNER; el propietario anterior conserva administración.
        await tx.organizationMember.updateMany({
          where: { organizationId: id, role: 'OWNER', userId: { not: ownerId } },
          data: { role: 'ADMIN' },
        });
        await tx.organizationMember.upsert({
          where: { organizationId_userId: { organizationId: id, userId: ownerId } },
          create: { organizationId: id, userId: ownerId, role: 'OWNER' },
          update: { role: 'OWNER' },
        });
      }
      return updated;
    });

    res.json({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      ownerId: organization.ownerId,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return res.status(404).json({ error: 'Organización no encontrada' });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'El identificador ya está en uso' });
    }
    console.error('Error al actualizar organización:', error);
    res.status(500).json({ error: 'Error al actualizar organización' });
  }
};
