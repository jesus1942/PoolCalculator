export type ProfessionBillingType = 'HOUR' | 'DAY' | 'M2' | 'ML' | 'BOCA';

export interface RoleRateLike {
  id?: string;
  name: string;
  hourlyRate?: number;
  dailyRate?: number;
  billingType?: ProfessionBillingType;
  ratePerUnit?: number;
  bocaRates?: any;
}

export interface LaborRoleBlueprint extends RoleRateLike {
  description: string;
  aliases: string[];
}

export interface LaborReferencePreset {
  id: string;
  label: string;
  location: string;
  effectiveDate: string;
  sourceSummary: string;
  sourceUrls: string[];
  roles: LaborRoleBlueprint[];
}

const SPECIALIZED_HOURLY = 7548;
const OFFICIAL_HOURLY = 6460;
const SEMI_OFFICIAL_HOURLY = 5958;
const HELPER_HOURLY = 5517;

const withDaily = (hourlyRate: number) => ({
  hourlyRate,
  dailyRate: hourlyRate * 8,
  billingType: 'HOUR' as const,
});

export const PUERTO_MADRYN_LABOR_REFERENCE: LaborReferencePreset = {
  id: 'puerto_madryn_chubut_2026_07',
  label: 'Puerto Madryn, Chubut - julio 2026',
  location: 'Puerto Madryn, Chubut, Argentina',
  effectiveDate: '2026-07-01',
  sourceSummary: 'Base de referencia tomada de escalas UOCRA Zona B vigentes en julio 2026 (paritaria abril 2026 - marzo 2027, aumento escalonado + sumas fijas). Puerto Madryn se mapea a Chubut/Zona B y se usa como punto de partida editable para instalación de piscinas.',
  sourceUrls: [
    'https://www.construar.com.ar/2026/02/paritaria-uocra-2026-nuevos-valores-por-hora-y-sumas-fijas-en-todo-el-pais/',
    'https://www.cronista.com/economia-politica/paritaria-uocra-2026-cuanto-cobraran-los-trabajadores-de-la-construccion-en-junio-julio-y-agosto/'
  ],
  roles: [
    {
      name: 'Capataz',
      description: 'Coordinación general de obra, replanteo, alineación y supervisión de montaje. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Encargado', 'Jefe de obra'],
      ...withDaily(SPECIALIZED_HOURLY),
    },
    {
      name: 'Excavador',
      description: 'Movimiento de suelo, excavación, perfilado y compactación. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Operador de excavadora', 'Excavación'],
      ...withDaily(SPECIALIZED_HOURLY),
    },
    {
      name: 'Instalador de Equipos',
      description: 'Montaje de bomba, filtro, calentador y equipos de cabecera. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Montaje de equipos', 'Equipista'],
      ...withDaily(SPECIALIZED_HOURLY),
    },
    {
      name: 'Especialista',
      description: 'Puesta en marcha, balance químico y ajustes finos. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Técnico', 'Puesta en marcha'],
      ...withDaily(SPECIALIZED_HOURLY),
    },
    {
      name: 'Gasista',
      description: 'Conexión y puesta en marcha de climatización a gas. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Instalador de gas'],
      ...withDaily(SPECIALIZED_HOURLY),
    },
    {
      name: 'Plomero',
      description: 'Instalación sanitaria/hidráulica, retornos, skimmers, hidrojets y cabecera. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Sanitarista', 'Instalador sanitario'],
      ...withDaily(OFFICIAL_HOURLY),
    },
    {
      name: 'Electricista',
      description: 'Cableado, tablero, luminarias y maniobras eléctricas. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Electricidad'],
      ...withDaily(OFFICIAL_HOURLY),
    },
    {
      name: 'Colocador',
      description: 'Colocación de losetas, remates y pastinado. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Colocador de Losetas', 'Colocador de revestimientos'],
      ...withDaily(OFFICIAL_HOURLY),
    },
    {
      name: 'Albañil',
      description: 'Cama, relleno, base, geomembrana y trabajos de apoyo civil. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Albanil', 'Medio oficial'],
      ...withDaily(SEMI_OFFICIAL_HOURLY),
    },
    {
      name: 'Ayudante',
      description: 'Apoyo general de obra, limpieza y asistencia. Referencia UOCRA Zona B julio 2026.',
      aliases: ['Peón', 'Peon'],
      ...withDaily(HELPER_HOURLY),
    },
  ],
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getRoleAliases = (roleName: string): string[] => {
  const normalizedTarget = normalize(roleName);
  const blueprint = PUERTO_MADRYN_LABOR_REFERENCE.roles.find((item) => {
    const possibleNames = [item.name, ...item.aliases];
    return possibleNames.some((possible) => normalize(possible) === normalizedTarget);
  });

  if (!blueprint) {
    return [roleName];
  }

  return Array.from(new Set([blueprint.name, ...blueprint.aliases]));
};

export const findMatchingRole = <T extends RoleRateLike>(roles: T[], suggestedRoleType?: string): T | undefined => {
  if (!suggestedRoleType) return undefined;

  const aliases = getRoleAliases(suggestedRoleType).map(normalize);

  return roles.find((role) => {
    const roleName = normalize(role.name);
    return aliases.some((alias) => roleName.includes(alias) || alias.includes(roleName));
  });
};

export const getReferenceRoleBlueprints = () => PUERTO_MADRYN_LABOR_REFERENCE.roles;
