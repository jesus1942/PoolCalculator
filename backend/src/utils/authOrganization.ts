import { Prisma } from '@prisma/client';
import prisma from '../config/database';

export class OrganizationAccessError extends Error {}

/** Resuelve el rol dentro del tenant sin extender permisos entre organizaciones. */
export const effectiveOrganizationRole = (userRole: string, membershipRole?: string | null) => {
  if (userRole === 'SUPERADMIN') return userRole;
  if (userRole === 'VIEWER' || membershipRole === 'VIEWER') return 'VIEWER';
  if (userRole === 'INSTALLER') return 'INSTALLER';
  return membershipRole === 'OWNER' || membershipRole === 'ADMIN' ? 'ADMIN' : 'USER';
};

/** Selecciona una membresía vigente sin restaurar accesos revocados al ingresar. */
export const ensureOrganizationInTransaction = async (tx: Prisma.TransactionClient, userId: string) => {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.currentOrgId) {
    const membership = await tx.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: user.currentOrgId, userId } },
    });
    if (membership || user.role === 'SUPERADMIN') return user.currentOrgId;
  }
  const membership = await tx.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  let orgId = membership?.organizationId;
  if (!orgId) {
    if (user.currentOrgId || user.role === 'INSTALLER' || user.role === 'VIEWER') {
      throw new OrganizationAccessError('Tu cuenta no tiene una organización activa. Contactá al administrador.');
    }
    const organization = await tx.organization.create({
      data: {
        name: `Org de ${user.name}`,
        slug: `org-${userId}`,
        ownerId: userId,
        members: { create: { userId, role: 'OWNER' } },
      },
    });
    orgId = organization.id;
  }
  await tx.user.update({ where: { id: userId }, data: { currentOrgId: orgId } });
  return orgId;
};

/** Reutiliza la misma provisión para ingreso por email y por Google. */
export const ensureCurrentOrganization = (userId: string) =>
  prisma.$transaction((tx) => ensureOrganizationInTransaction(tx, userId));

/** Devuelve el rol que deben ver tanto el frontend como los middlewares. */
export const getSessionRole = async (userId: string, userRole: string, orgId: string) => {
  const membership = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId: orgId, userId } },
    select: { role: true },
  });
  return effectiveOrganizationRole(userRole, membership?.role);
};
