import { Prisma } from '@prisma/client';
import prisma from '../config/database';

export const PROJECT_TAB_IDS = [
  'overview',
  'status',
  'tiles',
  'plumbing',
  'electrical',
  'hydraulic_pro',
  'electrical_pro',
  'tasks',
  'roles',
  'systems',
  'additionals',
  'export',
] as const;

export type ProjectTabId = typeof PROJECT_TAB_IDS[number];

type ProjectAccessRecord = {
  projectId: string;
  canEdit: boolean;
  canViewFinancials: boolean;
  allowedTabs: string[];
};

export type ProjectAccessProfile = {
  canAccess: boolean;
  canEdit: boolean;
  canViewFinancials: boolean;
  allowedTabs: ProjectTabId[];
  source: 'admin' | 'owner' | 'explicit' | 'assignment' | 'none';
};

export type ProjectActorContext = {
  userId?: string | null;
  role?: string | null;
  orgId?: string | null;
};

export type ProjectAccessContext = {
  explicitByProjectId: Map<string, ProjectAccessRecord>;
  assignedProjectIds: Set<string>;
};

const DEFAULT_SHARED_TABS: ProjectTabId[] = ['overview', 'status'];

const fetchExplicitProjectAccesses = async (userId: string): Promise<ProjectAccessRecord[]> => {
  const rows = await prisma.$queryRaw<Array<{
    projectId: string;
    canEdit: boolean;
    canViewFinancials: boolean;
    allowedTabs: string[] | null;
  }>>(Prisma.sql`
    SELECT "projectId", "canEdit", "canViewFinancials", "allowedTabs"
    FROM "ProjectAccess"
    WHERE "userId" = ${userId}
  `);

  return rows.map((row) => ({
    projectId: row.projectId,
    canEdit: Boolean(row.canEdit),
    canViewFinancials: Boolean(row.canViewFinancials),
    allowedTabs: Array.isArray(row.allowedTabs) ? row.allowedTabs : [],
  }));
};
const FINANCIAL_FIELD_KEYS = new Set([
  'laborCost',
  'materialCost',
  'totalCost',
  'price',
  'pricePerUnit',
  'customPricePerUnit',
  'customLaborCost',
  'grandTotal',
  'totalMaterialCost',
  'totalLaborCost',
  'totalBedMaterialCost',
  'totalPlumbingCost',
  'totalElectricalCost',
]);

export const isPlatformAdminRole = (role?: string | null) => role === 'ADMIN' || role === 'SUPERADMIN';

export const normalizeAllowedProjectTabs = (tabs?: string[] | null, fallback: ProjectTabId[] = DEFAULT_SHARED_TABS): ProjectTabId[] => {
  const validTabs = Array.isArray(tabs)
    ? tabs.filter((tab): tab is ProjectTabId => PROJECT_TAB_IDS.includes(tab as ProjectTabId))
    : [];

  const uniqueTabs = Array.from(new Set(validTabs));
  if (uniqueTabs.length > 0) {
    return uniqueTabs;
  }

  return [...fallback];
};

export const canManageOrganization = async (actor: ProjectActorContext) => {
  if (isPlatformAdminRole(actor.role)) return true;
  if (!actor.userId || !actor.orgId) return false;

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: actor.orgId,
        userId: actor.userId,
      },
    },
    select: { role: true },
  });

  return membership?.role === 'OWNER' || membership?.role === 'ADMIN';
};

export const getAssignedProjectIdsForUser = async (userId: string, orgId?: string | null) => {
  const assignedEvents = await prisma.agendaEvent.findMany({
    where: {
      projectId: { not: null },
      ...(orgId ? { organizationId: orgId } : {}),
      OR: [
        { assignees: { some: { userId } } },
        { crew: { members: { some: { userId } } } },
      ],
    },
    select: { projectId: true },
  });

  return Array.from(new Set(
    assignedEvents
      .map((event) => event.projectId)
      .filter((projectId): projectId is string => Boolean(projectId))
  ));
};

export const buildProjectAccessContext = async (userId: string, orgId?: string | null): Promise<ProjectAccessContext> => {
  const [explicitAccesses, assignedProjectIds] = await Promise.all([
    fetchExplicitProjectAccesses(userId),
    getAssignedProjectIdsForUser(userId, orgId),
  ]);

  return {
    explicitByProjectId: new Map(explicitAccesses.map((access: ProjectAccessRecord) => [access.projectId, access])),
    assignedProjectIds: new Set(assignedProjectIds),
  };
};

export const getAccessibleProjectIdsForUser = async (actor: ProjectActorContext) => {
  if (!actor.userId) return [];
  if (isPlatformAdminRole(actor.role)) {
    const projects = await prisma.project.findMany({
      where: actor.orgId ? { organizationId: actor.orgId } : {},
      select: { id: true },
    });
    return projects.map((project: { id: string }) => project.id);
  }

  const [ownedProjects, explicitAccesses, assignedProjectIds] = await Promise.all([
    prisma.project.findMany({
      where: { userId: actor.userId },
      select: { id: true },
    }),
    fetchExplicitProjectAccesses(actor.userId),
    getAssignedProjectIdsForUser(actor.userId, actor.orgId),
  ]);

  return Array.from(new Set([
    ...ownedProjects.map((project: { id: string }) => project.id),
    ...explicitAccesses.map((access: ProjectAccessRecord) => access.projectId),
    ...assignedProjectIds,
  ]));
};

export const buildProjectAccessProfileFromContext = (
  project: { id: string; userId: string },
  actor: ProjectActorContext,
  context?: ProjectAccessContext,
): ProjectAccessProfile => {
  if (!actor.userId) {
    return { canAccess: false, canEdit: false, canViewFinancials: false, allowedTabs: [], source: 'none' };
  }

  if (isPlatformAdminRole(actor.role)) {
    return {
      canAccess: true,
      canEdit: true,
      canViewFinancials: true,
      allowedTabs: [...PROJECT_TAB_IDS],
      source: 'admin',
    };
  }

  if (project.userId === actor.userId) {
    return {
      canAccess: true,
      canEdit: true,
      canViewFinancials: true,
      allowedTabs: [...PROJECT_TAB_IDS],
      source: 'owner',
    };
  }

  const explicitAccess = context?.explicitByProjectId.get(project.id);
  if (explicitAccess) {
    return {
      canAccess: true,
      canEdit: actor.role === 'VIEWER' ? false : Boolean(explicitAccess.canEdit),
      canViewFinancials: Boolean(explicitAccess.canViewFinancials),
      allowedTabs: normalizeAllowedProjectTabs(explicitAccess.allowedTabs),
      source: 'explicit',
    };
  }

  if (context?.assignedProjectIds.has(project.id)) {
    return {
      canAccess: true,
      canEdit: false,
      canViewFinancials: false,
      allowedTabs: ['overview', 'status'],
      source: 'assignment',
    };
  }

  return { canAccess: false, canEdit: false, canViewFinancials: false, allowedTabs: [], source: 'none' };
};

export const resolveProjectAccessProfile = async (
  project: { id: string; userId: string },
  actor: ProjectActorContext,
): Promise<ProjectAccessProfile> => {
  if (!actor.userId) {
    return { canAccess: false, canEdit: false, canViewFinancials: false, allowedTabs: [], source: 'none' };
  }

  const context = await buildProjectAccessContext(actor.userId, actor.orgId);
  return buildProjectAccessProfileFromContext(project, actor, context);
};

const stripFinancialFields = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(stripFinancialFields);
  }

  if (!value || typeof value !== 'object' || value instanceof Date) {
    return value;
  }

  const result: Record<string, any> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FINANCIAL_FIELD_KEYS.has(key)) {
      result[key] = typeof nestedValue === 'number' ? 0 : null;
      continue;
    }
    result[key] = stripFinancialFields(nestedValue);
  }

  return result;
};

export const sanitizeProjectForAccess = <T extends Record<string, any>>(project: T, access: ProjectAccessProfile): T & { currentUserAccess: ProjectAccessProfile } => {
  const enriched = {
    ...project,
    currentUserAccess: access,
  } as T & { currentUserAccess: ProjectAccessProfile };

  if (access.canViewFinancials) {
    return enriched;
  }

  const sanitized = stripFinancialFields(enriched);
  sanitized.materialCost = 0;
  sanitized.laborCost = 0;
  sanitized.totalCost = 0;
  return sanitized;
};
