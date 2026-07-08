import { OrganizationRole, Prisma } from '@prisma/client';
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import {
  PROJECT_TAB_IDS,
  canManageOrganization,
  normalizeAllowedProjectTabs,
  type ProjectTabId,
} from '../utils/projectAccess';

const isSuperadminRole = (role?: string) => role === 'SUPERADMIN';

const resolveTargetOrgId = (req: AuthRequest, bodyOrgId?: string) => {
  if (isSuperadminRole(req.user?.role) && bodyOrgId) {
    return bodyOrgId;
  }
  return req.user?.orgId || null;
};

// Los tenants solo gestionan instaladores: cualquier otro rol global
// (ADMIN, USER, VIEWER, SUPERADMIN) lo asigna únicamente el superadmin.
const canAssignRole = (requesterRole?: string, targetRole?: string) => {
  if (!targetRole) return true;
  if (isSuperadminRole(requesterRole)) return true;
  return targetRole === 'INSTALLER';
};

// Rol de organización que puede otorgar un tenant: nunca ADMIN/OWNER.
const clampOrgRoleForRequester = (requesterRole: string | undefined, orgRole: string): OrganizationRole => {
  if (isSuperadminRole(requesterRole)) return orgRole as OrganizationRole;
  return orgRole === 'VIEWER' ? OrganizationRole.VIEWER : OrganizationRole.MEMBER;
};

const ensureOrganizationAccess = async (req: AuthRequest, res: Response) => {
  const allowed = await canManageOrganization({
    userId: req.user?.userId,
    orgId: req.user?.orgId || null,
    role: req.user?.role,
  });

  if (!allowed) {
    res.status(403).json({ error: 'Se requiere permiso de administración sobre la organización' });
    return null;
  }

  return true;
};

const mapUserRow = (user: any, orgId?: string | null) => {
  const membershipRole = orgId && Array.isArray(user.organizationMemberships)
    ? user.organizationMemberships[0]?.role
    : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    orgRole: membershipRole,
    createdAt: user.createdAt,
  };
};

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const hasAccess = await ensureOrganizationAccess(req, res);
    if (!hasAccess) return;

    const orgId = req.user?.orgId || null;

    // Las cuentas SUPERADMIN (proveedor del SaaS) no se muestran a los tenants:
    // solo otro superadmin puede verlas y administrarlas.
    const hideSuperadmins = !isSuperadminRole(req.user?.role);

    const users = await prisma.user.findMany({
      where: {
        ...(orgId
          ? { organizationMemberships: { some: { organizationId: orgId } } }
          : {}),
        ...(hideSuperadmins ? { role: { not: 'SUPERADMIN' } } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        organizationMemberships: orgId
          ? {
              where: { organizationId: orgId },
              select: { role: true },
            }
          : false,
      },
      orderBy: { name: 'asc' },
    });

    res.json(users.map((user) => mapUserRow(user, orgId)));
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const hasAccess = await ensureOrganizationAccess(req, res);
    if (!hasAccess) return;

    const requesterRole = req.user?.role;
    const { email, name, password, role, orgRole, organizationId } = req.body || {};
    if (!email || !name) {
      return res.status(400).json({ error: 'Email y nombre son requeridos' });
    }

    if (!canAssignRole(requesterRole, role)) {
      return res.status(403).json({ error: 'No autorizado para asignar ese rol' });
    }

    const targetOrgId = resolveTargetOrgId(req, organizationId);
    if (!targetOrgId) {
      return res.status(400).json({ error: 'Organización requerida' });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    if (!user) {
      if (!password) {
        return res.status(400).json({ error: 'Password requerido para crear usuario nuevo' });
      }
      user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          // Los tenants solo dan de alta instaladores.
          role: role || (isSuperadminRole(requesterRole) ? 'USER' : 'INSTALLER'),
          currentOrgId: targetOrgId,
        },
      });
    } else {
      if (!isSuperadminRole(requesterRole) && user.role !== 'INSTALLER') {
        return res.status(403).json({ error: 'Solo podés gestionar instaladores de tu organización' });
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: name || user.name,
          role: role || user.role,
          password: user.password || hashedPassword || undefined,
          currentOrgId: user.currentOrgId || targetOrgId,
        },
      });
    }

    const membershipRole = clampOrgRoleForRequester(
      requesterRole,
      orgRole || (role === 'ADMIN' ? 'ADMIN' : 'MEMBER'),
    );
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId: user.id,
        },
      },
      create: {
        organizationId: targetOrgId,
        userId: user.id,
        role: membershipRole,
      },
      update: { role: membershipRole },
    });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgRole: membershipRole,
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const hasAccess = await ensureOrganizationAccess(req, res);
    if (!hasAccess) return;

    const requesterRole = req.user?.role;
    const { id } = req.params;
    const { name, role, password, orgRole, organizationId } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'ID de usuario requerido' });
    }

    if (!canAssignRole(requesterRole, role)) {
      return res.status(403).json({ error: 'No autorizado para asignar ese rol' });
    }

    const targetOrgId = resolveTargetOrgId(req, organizationId);
    if (!targetOrgId) {
      return res.status(400).json({ error: 'Organización requerida' });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId: id,
        },
      },
    });

    if (!membership && !isSuperadminRole(requesterRole)) {
      return res.status(403).json({ error: 'Usuario fuera de tu organización' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.role === 'SUPERADMIN' && !isSuperadminRole(requesterRole)) {
      return res.status(403).json({ error: 'No autorizado para modificar SUPERADMIN' });
    }

    // Los tenants solo editan sus instaladores; el resto de las cuentas
    // (admins, usuarios, viewers) las administra el superadmin.
    if (!isSuperadminRole(requesterRole) && user.role !== 'INSTALLER') {
      return res.status(403).json({ error: 'Solo podés gestionar instaladores de tu organización' });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? user.name,
        role: role ?? user.role,
        password: hashedPassword ?? undefined,
      },
    });

    let updatedOrgRole = membership?.role || null;
    if (orgRole) {
      const clampedOrgRole = clampOrgRoleForRequester(requesterRole, orgRole);
      const updatedMembership = await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: targetOrgId,
            userId: id,
          },
        },
        create: {
          organizationId: targetOrgId,
          userId: id,
          role: clampedOrgRole,
        },
        update: { role: clampedOrgRole },
      });
      updatedOrgRole = updatedMembership.role;
    }

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      orgRole: updatedOrgRole,
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

export const getUserProjectAccess = async (req: AuthRequest, res: Response) => {
  try {
    const hasAccess = await ensureOrganizationAccess(req, res);
    if (!hasAccess) return;

    const { id } = req.params;
    const orgId = resolveTargetOrgId(req);
    if (!id || !orgId) {
      return res.status(400).json({ error: 'Usuario y organización requeridos' });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: id,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'El usuario no pertenece a la organización actual' });
    }

    const [targetUser, projects, explicitAccessRows] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, role: true },
      }),
      prisma.project.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          name: true,
          clientName: true,
          status: true,
          userId: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.$queryRaw<Array<{
        projectId: string;
        canEdit: boolean;
        canViewFinancials: boolean;
        allowedTabs: string[] | null;
      }>>(Prisma.sql`
        SELECT "projectId", "canEdit", "canViewFinancials", "allowedTabs"
        FROM "ProjectAccess"
        WHERE "userId" = ${id} AND "organizationId" = ${orgId}
      `),
    ]);

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (targetUser.role === 'SUPERADMIN' && !isSuperadminRole(req.user?.role)) {
      return res.status(403).json({ error: 'No autorizado para gestionar cuentas SUPERADMIN' });
    }

    const explicitAccessByProjectId = new Map(explicitAccessRows.map((row: { projectId: string; canEdit: boolean; canViewFinancials: boolean; allowedTabs: string[] | null }) => [row.projectId, row]));

    const response = projects.map((project) => {
      const explicitAccess = explicitAccessByProjectId.get(project.id);
      const inheritedFromOwnership = project.userId === id;
      const enabled = inheritedFromOwnership || Boolean(explicitAccess);
      const allowedTabs = inheritedFromOwnership
        ? [...PROJECT_TAB_IDS]
        : explicitAccess
          ? normalizeAllowedProjectTabs(explicitAccess.allowedTabs || [])
          : [];

      return {
        projectId: project.id,
        name: project.name,
        clientName: project.clientName,
        status: project.status,
        enabled,
        canEdit: inheritedFromOwnership ? true : Boolean(explicitAccess?.canEdit && targetUser.role !== 'VIEWER'),
        canViewFinancials: inheritedFromOwnership ? true : Boolean(explicitAccess?.canViewFinancials),
        allowedTabs,
        inheritedFromOwnership,
      };
    });

    res.json({
      user: targetUser,
      tabsCatalog: [...PROJECT_TAB_IDS],
      projects: response,
    });
  } catch (error) {
    console.error('Error al obtener accesos a proyectos del usuario:', error);
    res.status(500).json({ error: 'Error al obtener accesos a proyectos del usuario' });
  }
};

export const updateUserProjectAccess = async (req: AuthRequest, res: Response) => {
  try {
    const hasAccess = await ensureOrganizationAccess(req, res);
    if (!hasAccess) return;

    const { id, projectId } = req.params;
    const orgId = resolveTargetOrgId(req);
    if (!id || !projectId || !orgId) {
      return res.status(400).json({ error: 'Usuario, proyecto y organización son requeridos' });
    }

    const { enabled, canEdit, canViewFinancials, allowedTabs } = req.body || {};
    const [targetUser, project] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { id: true, role: true } }),
      prisma.project.findFirst({ where: { id: projectId, organizationId: orgId }, select: { id: true, userId: true } }),
    ]);

    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (targetUser.role === 'SUPERADMIN' && !isSuperadminRole(req.user?.role)) {
      return res.status(403).json({ error: 'No autorizado para gestionar cuentas SUPERADMIN' });
    }

    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado en la organización actual' });
    }

    if (project.userId === id) {
      return res.status(400).json({ error: 'El propietario del proyecto ya tiene acceso total heredado' });
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: id,
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ error: 'El usuario no pertenece a la organización actual' });
    }

    if (!enabled) {
      await prisma.$executeRaw(Prisma.sql`
        DELETE FROM "ProjectAccess"
        WHERE "projectId" = ${projectId} AND "userId" = ${id}
      `);

      return res.json({
        projectId,
        enabled: false,
        canEdit: false,
        canViewFinancials: false,
        allowedTabs: [],
      });
    }

    const normalizedTabs = normalizeAllowedProjectTabs(allowedTabs as ProjectTabId[] | undefined);
    const nextCanEdit = targetUser.role === 'VIEWER' ? false : Boolean(canEdit);
    const nextCanViewFinancials = Boolean(canViewFinancials);

    const tabsLiteral = Prisma.sql`ARRAY[${Prisma.join(normalizedTabs)}]::TEXT[]`;

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "ProjectAccess" ("id", "projectId", "userId", "organizationId", "canEdit", "canViewFinancials", "allowedTabs", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${projectId}, ${id}, ${orgId}, ${nextCanEdit}, ${nextCanViewFinancials}, ${tabsLiteral}, NOW(), NOW())
      ON CONFLICT ("projectId", "userId")
      DO UPDATE SET
        "organizationId" = EXCLUDED."organizationId",
        "canEdit" = EXCLUDED."canEdit",
        "canViewFinancials" = EXCLUDED."canViewFinancials",
        "allowedTabs" = EXCLUDED."allowedTabs",
        "updatedAt" = NOW()
    `);

    res.json({
      projectId,
      enabled: true,
      canEdit: nextCanEdit,
      canViewFinancials: nextCanViewFinancials,
      allowedTabs: normalizedTabs,
    });
  } catch (error) {
    console.error('Error al actualizar acceso del usuario al proyecto:', error);
    res.status(500).json({ error: 'Error al actualizar acceso del usuario al proyecto' });
  }
};
