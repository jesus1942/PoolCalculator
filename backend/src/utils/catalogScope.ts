/**
 * Helpers de aislamiento multitenant para los catálogos (losetas, accesorios,
 * equipos, materiales de construcción, plomería).
 *
 * Modelo: `organizationId` NULL = catálogo global/base compartido (el catálogo
 * histórico/seed de ACQUAM). Con valor = catálogo propio de un tenant.
 *
 * Cada tenant ve su catálogo propio + el global. Sus filas tienen precedencia
 * cuando el motor de cálculo busca por `type` (toma la primera coincidencia).
 */

type CatalogRow = { organizationId?: string | null };

/**
 * Cláusula `where` de visibilidad: el tenant ve sus filas + las globales.
 * Sin orgId (proyectos/usuarios legacy sin organización) ve solo las globales,
 * que es exactamente el comportamiento previo a la migración.
 */
export const catalogVisibilityWhere = (orgId?: string | null) =>
  orgId
    ? { OR: [{ organizationId: orgId }, { organizationId: null }] }
    : { organizationId: null };

/**
 * Reordena dejando las filas propias del tenant primero (las globales después),
 * preservando el orden relativo original dentro de cada grupo. Importa para el
 * matcheo por `type` del motor de cálculo, donde gana la primera coincidencia.
 */
export const sortTenantFirst = <T extends CatalogRow>(rows: T[], orgId?: string | null): T[] => {
  if (!orgId) return rows;
  const own: T[] = [];
  const global: T[] = [];
  for (const row of rows) {
    (row.organizationId === orgId ? own : global).push(row);
  }
  return [...own, ...global];
};

/**
 * Determina si un actor puede escribir (editar/eliminar) una fila de catálogo:
 * - SUPERADMIN: puede gestionar el catálogo global y cualquiera.
 * - Resto: solo filas propias de su organización.
 *   Las filas globales (organizationId NULL) quedan protegidas para no
 *   contaminar el catálogo base de todos los tenants.
 */
export const canWriteCatalogRow = (
  row: CatalogRow,
  actor: { role?: string | null; orgId?: string | null },
): boolean => {
  if (actor.role === 'SUPERADMIN') return true;
  return Boolean(row.organizationId) && row.organizationId === actor.orgId;
};

/**
 * organizationId con el que se debe crear una fila nueva:
 * - SUPERADMIN crea en el catálogo global (NULL) salvo que indique una org.
 * - Resto crea siempre dentro de su propia organización.
 */
export const resolveCreateOrganizationId = (
  actor: { role?: string | null; orgId?: string | null },
  explicitOrgId?: string | null,
): string | null => {
  if (actor.role === 'SUPERADMIN') {
    return explicitOrgId ?? null;
  }
  return actor.orgId ?? null;
};
