import prisma from '../config/database';

/** Comprueba el ámbito sin convertir una organización ausente en acceso global. */
export const belongsToOrganization = (resourceOrgId?: string | null, actorOrgId?: string | null) =>
  Boolean(resourceOrgId && actorOrgId && resourceOrgId === actorOrgId);

/** Normaliza listas de personas; rechaza valores malformados antes de modificar relaciones. */
export const normalizeMemberIds = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !id.trim())) return null;
  return [...new Set(value as string[])];
};

/** La pertenencia es la membresía real; currentOrgId solo indica qué empresa está abierta. */
export const usersBelongToOrganization = async (userIds: string[], organizationId?: string | null) => {
  if (userIds.length === 0) return true;
  if (!organizationId) return false;
  const ids = [...new Set(userIds)];
  const count = await prisma.organizationMember.count({
    where: { organizationId, userId: { in: ids } },
  });
  return count === ids.length;
};
