/** Únicamente campos editables: nunca identidades, propietarios ni relaciones Prisma anidadas. */
const EDITABLE_PROJECT_FIELDS = new Set([
  'name', 'clientName', 'clientEmail', 'clientPhone', 'location', 'poolPresetId',
  'excavationLength', 'excavationWidth', 'excavationDepth', 'perimeter',
  'waterMirrorArea', 'volume', 'tileCalculation', 'totalTileArea', 'sidewalkArea',
  'plumbingConfig', 'electricalConfig', 'materials', 'tasks', 'exportSettings',
  'laborCost', 'materialCost', 'totalCost', 'status',
]);

export const pickProjectMutation = (body: Record<string, unknown>): Record<string, any> =>
  Object.fromEntries(Object.entries(body).filter(([key]) => EDITABLE_PROJECT_FIELDS.has(key)));
