/**
 * Sistemas de unión de cañería y factores de complejidad de obra.
 *
 * La instalación base del catálogo está tarifada para cañería de PVC pegado.
 * Los sistemas por fusión (termofusión / electrofusión, ej. Acqua System PP)
 * requieren soldar cada unión con máquina, más tiempo por boca y mano de obra
 * especializada, por lo que la mano de obra hidráulica se ajusta con un
 * multiplicador. Los factores de obra (izaje con grúa sobre vivienda, montaje
 * de equipos en espacio reducido, bomba dedicada de hidrojets) agregan tareas
 * con recargos fijos de referencia, editables luego por proyecto.
 */

export type PipeSystem = 'PVC' | 'TERMOFUSION' | 'ELECTROFUSION';

export interface PipeSystemInfo {
  id: PipeSystem;
  label: string;
  shortLabel: string;
  /** Multiplicador de horas y costo de mano de obra hidráulica respecto a PVC pegado */
  laborFactor: number;
  /** Material equivalente para el cálculo de pérdida de carga (Hazen-Williams) */
  hydraulicMaterial: 'PVC' | 'PP';
  description: string;
}

export const PIPE_SYSTEMS: Record<PipeSystem, PipeSystemInfo> = {
  PVC: {
    id: 'PVC',
    label: 'PVC pegado (estándar)',
    shortLabel: 'PVC',
    laborFactor: 1,
    hydraulicMaterial: 'PVC',
    description: 'Uniones con adhesivo. Sistema estándar de la instalación base.',
  },
  TERMOFUSION: {
    id: 'TERMOFUSION',
    label: 'Termofusión (PP tipo Acqua System)',
    shortLabel: 'Termofusión',
    laborFactor: 1.35,
    hydraulicMaterial: 'PP',
    description: 'Cada unión se suelda con termofusora. Más tiempo por boca y mano de obra especializada.',
  },
  ELECTROFUSION: {
    id: 'ELECTROFUSION',
    label: 'Electrofusión (PP/PE con accesorios electrosoldables)',
    shortLabel: 'Electrofusión',
    laborFactor: 1.5,
    hydraulicMaterial: 'PP',
    description: 'Uniones con accesorios electrosoldables y equipo de electrofusión. Máxima exigencia de mano de obra.',
  },
};

export interface InstallationFactors {
  pipeSystem: PipeSystem;
  /** Izaje del casco con grúa por sobre una estructura/vivienda (maniobra riesgosa a cargo del instalador) */
  craneLiftOverStructure: boolean;
  /** Montaje de cabecera/equipos en un espacio predeterminado reducido */
  confinedEquipmentSpace: boolean;
  /** Instalación de bomba dedicada para el circuito de hidrojets */
  hydrojetDedicatedPump: boolean;
}

export const DEFAULT_INSTALLATION_FACTORS: InstallationFactors = {
  pipeSystem: 'PVC',
  craneLiftOverStructure: false,
  confinedEquipmentSpace: false,
  hydrojetDedicatedPump: false,
};

// Recargos fijos de referencia (ARS), calibrados con escalas UOCRA Zona B 2026
// y valores de mercado de instalación de piscinas de fibra en Patagonia.
export const CRANE_LIFT_LABOR_SURCHARGE = 350_000;
export const CONFINED_EQUIPMENT_SPACE_SURCHARGE = 120_000;
export const HYDROJET_BOCA_LABOR_COST = 45_000;
export const HYDROJET_DEDICATED_PUMP_SURCHARGE = 150_000;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const resolvePipeSystem = (value?: string | null): PipeSystem => {
  if (!value) return 'PVC';
  const normalized = normalize(String(value));
  if (normalized.includes('electro')) return 'ELECTROFUSION';
  if (normalized.includes('termo') || normalized.includes('fusion') || normalized === 'pp' || normalized.includes('polipropileno')) {
    return 'TERMOFUSION';
  }
  return 'PVC';
};

export const getPipeSystemInfo = (system?: PipeSystem | string | null): PipeSystemInfo =>
  PIPE_SYSTEMS[resolvePipeSystem(typeof system === 'string' ? system : system || undefined)];

/**
 * Lee los factores de instalación desde el plumbingConfig (JSON) del proyecto.
 * Tolera configs viejos sin estos campos.
 */
export const resolveInstallationFactors = (plumbingConfig: any): InstallationFactors => {
  const config = plumbingConfig && typeof plumbingConfig === 'object' ? plumbingConfig : {};
  const rawFactors = config.installationFactors && typeof config.installationFactors === 'object'
    ? config.installationFactors
    : {};

  return {
    pipeSystem: resolvePipeSystem(config.pipeSystem ?? rawFactors.pipeSystem),
    craneLiftOverStructure: Boolean(rawFactors.craneLiftOverStructure),
    confinedEquipmentSpace: Boolean(rawFactors.confinedEquipmentSpace),
    hydrojetDedicatedPump: Boolean(rawFactors.hydrojetDedicatedPump),
  };
};

export const installationFactorsEqual = (a: InstallationFactors, b: InstallationFactors) =>
  a.pipeSystem === b.pipeSystem &&
  a.craneLiftOverStructure === b.craneLiftOverStructure &&
  a.confinedEquipmentSpace === b.confinedEquipmentSpace &&
  a.hydrojetDedicatedPump === b.hydrojetDedicatedPump;
