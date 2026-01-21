/**
 * Sistema profesional de cálculos eléctricos para piscinas
 * Incluye: caída de tensión, factor de potencia, dimensionamiento de cables y protecciones
 */

import { Project, EquipmentPreset, PoolPreset } from '@prisma/client';

// ==================== INTERFACES ====================

export interface ElectricalLoad {
  name: string;
  type: 'PUMP' | 'LIGHTING' | 'HEATING' | 'AUTOMATION' | 'TRANSFORMER' | 'OTHER';
  power: number;           // Watts
  voltage: number;         // Volts (220V, 380V, 12V)
  quantity: number;
  powerFactor: number;     // cos φ (0-1)
  efficiency: number;      // η (0-1)
  simultaneity: number;    // Factor de simultaneidad (0-1)
}

export interface CableCalculation {
  section: number;         // mm²
  sectionLabel: string;    // "2.5mm²", "4mm²", etc.
  current: number;         // Amperes
  voltageDrop: number;     // Volts
  voltageDropPercent: number;  // %
  acceptable: boolean;
  recommendation?: string;
}

export interface ProtectionCalculation {
  breaker: number;         // Amperes (térmica)
  rcd: number;             // Amperes (diferencial)
  breakerType: string;     // Tipo de curva (B, C, D)
  rcdSensitivity: number;  // mA (30mA para piscinas)
}

export interface ElectricalSystemResult {
  loads: ElectricalLoad[];

  // Consumos
  totalPowerInstalled: number;     // Watts instalados
  totalPowerDemand: number;        // Watts con simultaneidad
  totalCurrent: number;            // Amperes

  // Cable
  cable: CableCalculation;

  // Protecciones
  protection: ProtectionCalculation;

  // Costos operativos
  operatingCost: {
    dailyKwh: number;
    dailyCost: number;          // ARS
    monthlyCost: number;        // ARS
    annualCost: number;         // ARS
  };

  // Validaciones
  warnings: string[];
  errors: string[];
  isValid: boolean;
}

export interface ElectricalConfig {
  distanceToPanel: number;         // metros
  voltage: number;                 // 220V o 380V
  installationType: 'AERIAL' | 'BURIED' | 'CONDUIT';
  ambientTemp: number;             // °C
  maxVoltageDrop: number;          // % (normalmente 3%)
  electricityCostPerKwh: number;   // ARS
}

// ==================== CONSTANTES ====================

const COPPER_RESISTIVITY = 0.01724;  // Ohm·mm²/m a 20°C
const ALUMINUM_RESISTIVITY = 0.02826; // Ohm·mm²/m a 20°C

const STANDARD_CABLE_SECTIONS = [
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240
]; // mm²

const STANDARD_BREAKERS = [
  10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125
]; // Amperes

const STANDARD_RCD = [
  16, 25, 40, 63, 80, 100
]; // Amperes

// Factor de corrección por temperatura
const TEMP_CORRECTION_FACTORS: { [key: number]: number } = {
  20: 1.00,
  25: 0.97,
  30: 0.93,
  35: 0.90,
  40: 0.87,
  45: 0.83,
  50: 0.80
};

// Factor de corrección por tipo de instalación
const INSTALLATION_FACTORS = {
  AERIAL: 1.00,      // Aérea - mejor disipación
  CONDUIT: 0.80,     // En cañería - peor disipación
  BURIED: 0.70       // Enterrada - peor disipación
};

// Factor de potencia típico por tipo de carga
const TYPICAL_POWER_FACTORS = {
  PUMP: 0.85,           // Motores
  LIGHTING: 0.95,       // LED
  HEATING: 0.98,        // Resistivo
  AUTOMATION: 0.90,     // Equipos electrónicos
  TRANSFORMER: 0.85,    // Transformadores
  OTHER: 0.90
};

// Eficiencia típica por tipo de carga
const TYPICAL_EFFICIENCY = {
  PUMP: 0.85,
  LIGHTING: 0.90,
  HEATING: 0.95,
  AUTOMATION: 0.90,
  TRANSFORMER: 0.85,
  OTHER: 0.85
};

// Factor de simultaneidad (no todos los equipos funcionan al mismo tiempo)
const SIMULTANEITY_FACTORS = {
  PUMP: 1.0,            // Bomba siempre funciona cuando hay filtración
  LIGHTING: 0.5,        // Luces no siempre están encendidas
  HEATING: 0.7,         // Calefacción no siempre activa
  AUTOMATION: 1.0,      // Automatización siempre activa
  TRANSFORMER: 1.0,     // Siempre que las luces están encendidas
  OTHER: 0.8
};

// ==================== FUNCIONES DE CÁLCULO ====================

/**
 * Extrae las cargas eléctricas del proyecto
 */
export function extractProjectLoads(
  project: Project & {
    poolPreset: PoolPreset;
    projectAdditionals?: any[];
  }
): ElectricalLoad[] {
  const loads: ElectricalLoad[] = [];
  const preset = project.poolPreset;

  // Iluminación
  if (preset.hasLighting && preset.lightingCount > 0) {
    loads.push({
      name: `Luces LED ${preset.lightingType || 'RGB'}`,
      type: 'LIGHTING',
      power: 50,  // Watts por luz (LED típico)
      voltage: 12,
      quantity: preset.lightingCount,
      powerFactor: TYPICAL_POWER_FACTORS.LIGHTING,
      efficiency: TYPICAL_EFFICIENCY.LIGHTING,
      simultaneity: SIMULTANEITY_FACTORS.LIGHTING
    });

    // Transformador para las luces
    loads.push({
      name: 'Transformador 220V a 12V',
      type: 'TRANSFORMER',
      power: preset.lightingCount * 50 * 1.2, // 20% margen
      voltage: 220,
      quantity: 1,
      powerFactor: TYPICAL_POWER_FACTORS.TRANSFORMER,
      efficiency: TYPICAL_EFFICIENCY.TRANSFORMER,
      simultaneity: SIMULTANEITY_FACTORS.TRANSFORMER
    });
  }

  // Bomba de filtrado (estimada - será reemplazada con la seleccionada)
  loads.push({
    name: 'Bomba de filtrado',
    type: 'PUMP',
    power: estimatePumpPower(project.volume),
    voltage: 220,
    quantity: 1,
    powerFactor: TYPICAL_POWER_FACTORS.PUMP,
    efficiency: TYPICAL_EFFICIENCY.PUMP,
    simultaneity: SIMULTANEITY_FACTORS.PUMP
  });

  // Extraer equipos adicionales
  if (project.projectAdditionals && Array.isArray(project.projectAdditionals)) {
    project.projectAdditionals.forEach((additional: any) => {
      if (additional.equipment && additional.equipment.consumption) {
        const equip = additional.equipment;
        const type = mapEquipmentTypeToLoadType(equip.type);

        loads.push({
          name: equip.name,
          type,
          power: equip.consumption,
          voltage: equip.voltage || 220,
          quantity: additional.newQuantity || 1,
          powerFactor: TYPICAL_POWER_FACTORS[type],
          efficiency: TYPICAL_EFFICIENCY[type],
          simultaneity: SIMULTANEITY_FACTORS[type]
        });
      }
    });
  }

  // Extraer de electricalConfig si existe
  if (project.electricalConfig && typeof project.electricalConfig === 'object') {
    const config = project.electricalConfig as any;
    if (config.items && Array.isArray(config.items)) {
      config.items.forEach((item: any) => {
        const type = item.type?.toUpperCase() as keyof typeof TYPICAL_POWER_FACTORS || 'OTHER';
        loads.push({
          name: item.name,
          type,
          power: item.watts,
          voltage: item.voltage || 220,
          quantity: item.quantity || 1,
          powerFactor: TYPICAL_POWER_FACTORS[type] || 0.9,
          efficiency: TYPICAL_EFFICIENCY[type] || 0.85,
          simultaneity: SIMULTANEITY_FACTORS[type] || 0.8
        });
      });
    }
  }

  return loads;
}

/**
 * Estima la potencia de la bomba según el volumen de la piscina
 */
function estimatePumpPower(volume: number): number {
  // Regla general: 0.5 HP por cada 20m³
  const hp = Math.ceil(volume / 20) * 0.5;
  return hp * 745.7; // HP a Watts
}

/**
 * Mapea el tipo de equipo al tipo de carga eléctrica
 */
function mapEquipmentTypeToLoadType(equipType: string): keyof typeof TYPICAL_POWER_FACTORS {
  const type = equipType.toUpperCase();
  if (type.includes('PUMP')) return 'PUMP';
  if (type.includes('HEAT')) return 'HEATING';
  if (type.includes('LIGHT')) return 'LIGHTING';
  if (type.includes('AUTO')) return 'AUTOMATION';
  return 'OTHER';
}

/**
 * Calcula la corriente total considerando factor de potencia
 * I = P / (V × cos φ × η)
 */
export function calculateTotalCurrent(
  loads: ElectricalLoad[],
  voltage: number = 220
): { installed: number; demand: number } {
  let installedCurrent = 0;
  let demandCurrent = 0;

  loads.forEach(load => {
    const totalPower = load.power * load.quantity;

    // Corriente instalada (sin factor de simultaneidad)
    const current = totalPower / (voltage * load.powerFactor * load.efficiency);
    installedCurrent += current;

    // Corriente de demanda (con factor de simultaneidad)
    demandCurrent += current * load.simultaneity;
  });

  return {
    installed: installedCurrent,
    demand: demandCurrent
  };
}

/**
 * Calcula la caída de tensión en el cable
 * ΔV = (2 × L × I × ρ) / S
 * Donde:
 *   ΔV = caída de tensión (V)
 *   L = longitud del cable (m)
 *   I = corriente (A)
 *   ρ = resistividad del conductor (Ohm·mm²/m)
 *   S = sección del cable (mm²)
 */
export function calculateVoltageDrop(
  current: number,         // Amperes
  distance: number,        // metros (distancia real, no ida+vuelta)
  cableSection: number,    // mm²
  voltage: number = 220,   // Voltios
  material: 'COPPER' | 'ALUMINUM' = 'COPPER',
  ambientTemp: number = 25 // °C
): { drop: number; dropPercent: number; acceptable: boolean } {
  const resistivity = material === 'COPPER' ? COPPER_RESISTIVITY : ALUMINUM_RESISTIVITY;

  // Factor de corrección por temperatura
  const tempFactor = getTemperatureCorrectionFactor(ambientTemp);
  const adjustedResistivity = resistivity * tempFactor;

  // Fórmula: ida + vuelta = 2 × distancia
  const voltageDrop = (2 * distance * current * adjustedResistivity) / cableSection;
  const dropPercent = (voltageDrop / voltage) * 100;

  return {
    drop: voltageDrop,
    dropPercent,
    acceptable: dropPercent <= 3 // Máximo 3% según REBT/IEC
  };
}

/**
 * Obtiene el factor de corrección por temperatura
 */
function getTemperatureCorrectionFactor(temp: number): number {
  // Redondear a múltiplo de 5
  const roundedTemp = Math.round(temp / 5) * 5;
  return TEMP_CORRECTION_FACTORS[roundedTemp] || 1.0;
}

/**
 * Selecciona la sección de cable adecuada considerando:
 * 1. Capacidad de corriente (ampacidad)
 * 2. Caída de tensión máxima permitida
 */
export function selectCableSection(
  current: number,
  distance: number,
  config: ElectricalConfig
): CableCalculation {
  // Aplicar factor de instalación
  const installationFactor = INSTALLATION_FACTORS[config.installationType];
  const adjustedCurrent = current / installationFactor;

  // Buscar la sección mínima que cumpla con caída de tensión
  for (const section of STANDARD_CABLE_SECTIONS) {
    const vdrop = calculateVoltageDrop(
      current,
      distance,
      section,
      config.voltage,
      'COPPER',
      config.ambientTemp
    );

    if (vdrop.acceptable) {
      let recommendation = undefined;

      if (vdrop.dropPercent > 2.5) {
        recommendation = 'Caída de tensión cercana al límite. Considerar sección superior para mayor eficiencia.';
      }

      return {
        section,
        sectionLabel: `${section}mm²`,
        current,
        voltageDrop: vdrop.drop,
        voltageDropPercent: vdrop.dropPercent,
        acceptable: true,
        recommendation
      };
    }
  }

  // Si ninguna sección cumple, retornar la máxima con advertencia
  const maxSection = STANDARD_CABLE_SECTIONS[STANDARD_CABLE_SECTIONS.length - 1];
  const vdrop = calculateVoltageDrop(
    current,
    distance,
    maxSection,
    config.voltage,
    'COPPER',
    config.ambientTemp
  );

  return {
    section: maxSection,
    sectionLabel: `${maxSection}mm²`,
    current,
    voltageDrop: vdrop.drop,
    voltageDropPercent: vdrop.dropPercent,
    acceptable: false,
    recommendation: 'ADVERTENCIA: Caída de tensión excesiva. Reducir distancia o aumentar voltaje a 380V trifásico.'
  };
}

/**
 * Calcula el breaker (térmica) recomendado
 * Debe ser >= 1.25 × Corriente nominal (factor de seguridad NEC/IEC)
 */
export function calculateBreaker(current: number): ProtectionCalculation {
  const minBreaker = current * 1.25;

  // Buscar el breaker estándar más cercano por encima
  const selectedBreaker = STANDARD_BREAKERS.find(b => b >= minBreaker) || STANDARD_BREAKERS[STANDARD_BREAKERS.length - 1];

  // Seleccionar RCD (diferencial) >= breaker
  const selectedRCD = STANDARD_RCD.find(r => r >= selectedBreaker) || STANDARD_RCD[STANDARD_RCD.length - 1];

  // Tipo de curva según carga
  let breakerType = 'C'; // Curva C para cargas generales
  if (current > 50) breakerType = 'D'; // Curva D para cargas inductivas altas

  return {
    breaker: selectedBreaker,
    rcd: selectedRCD,
    breakerType,
    rcdSensitivity: 30 // 30mA obligatorio para piscinas
  };
}

/**
 * Calcula los costos operativos
 */
export function calculateOperatingCosts(
  loads: ElectricalLoad[],
  dailyOperatingHours: number,
  electricityCostPerKwh: number
): {
  dailyKwh: number;
  dailyCost: number;
  monthlyCost: number;
  annualCost: number;
} {
  // Calcular kWh diarios considerando simultaneidad
  let dailyKwh = 0;
  loads.forEach(load => {
    const powerKw = (load.power * load.quantity) / 1000;
    const hours = load.type === 'PUMP' ? dailyOperatingHours : dailyOperatingHours * load.simultaneity;
    dailyKwh += powerKw * hours;
  });

  const dailyCost = dailyKwh * electricityCostPerKwh;
  const monthlyCost = dailyCost * 30;
  const annualCost = dailyCost * 365;

  return {
    dailyKwh,
    dailyCost,
    monthlyCost,
    annualCost
  };
}

/**
 * Calcula el sistema eléctrico completo
 */
export function calculateElectricalSystem(
  project: Project & { poolPreset: PoolPreset },
  config: ElectricalConfig
): ElectricalSystemResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Extraer cargas
  const loads = extractProjectLoads(project);

  if (loads.length === 0) {
    errors.push('No se encontraron cargas eléctricas en el proyecto');
  }

  // Calcular potencias totales
  const totalPowerInstalled = loads.reduce((sum, load) =>
    sum + (load.power * load.quantity), 0
  );

  const totalPowerDemand = loads.reduce((sum, load) =>
    sum + (load.power * load.quantity * load.simultaneity), 0
  );

  // Calcular corrientes
  const currents = calculateTotalCurrent(loads, config.voltage);

  // Usar corriente de demanda para dimensionamiento
  const designCurrent = currents.demand;

  // Seleccionar cable
  const cable = selectCableSection(designCurrent, config.distanceToPanel, config);

  if (!cable.acceptable) {
    errors.push(cable.recommendation || 'Cable insuficiente para la distancia');
  } else if (cable.recommendation) {
    warnings.push(cable.recommendation);
  }

  // Calcular protección
  const protection = calculateBreaker(designCurrent);

  // Validaciones adicionales
  if (config.distanceToPanel > 50) {
    warnings.push(`Distancia muy larga (${config.distanceToPanel}m). Considerar voltaje trifásico 380V para reducir pérdidas.`);
  }

  if (totalPowerInstalled > 10000) { // > 10kW
    warnings.push('Potencia elevada. Verificar que la acometida eléctrica soporte la carga.');
  }

  if (config.ambientTemp > 35) {
    warnings.push(`Temperatura ambiente alta (${config.ambientTemp}°C). Se ha aplicado factor de corrección al cable.`);
  }

  // Calcular costos operativos
  const operatingHoursPerDay = 8; // Filtración típica
  const operatingCost = calculateOperatingCosts(
    loads,
    operatingHoursPerDay,
    config.electricityCostPerKwh
  );

  return {
    loads,
    totalPowerInstalled,
    totalPowerDemand,
    totalCurrent: designCurrent,
    cable,
    protection,
    operatingCost,
    warnings,
    errors,
    isValid: errors.length === 0
  };
}

/**
 * Genera un reporte detallado del sistema eléctrico
 */
export function generateElectricalReport(result: ElectricalSystemResult): string {
  let report = '=== INFORME ELÉCTRICO PROFESIONAL ===\n\n';

  report += '1. CARGAS INSTALADAS:\n';
  result.loads.forEach(load => {
    const totalPower = load.power * load.quantity;
    report += `   • ${load.name}: ${totalPower}W (${load.quantity}x${load.power}W) @ ${load.voltage}V\n`;
    report += `     Factor potencia: ${load.powerFactor} | Simultaneidad: ${(load.simultaneity * 100).toFixed(0)}%\n`;
  });

  report += `\n2. CONSUMO TOTAL:\n`;
  report += `   • Potencia instalada: ${(result.totalPowerInstalled / 1000).toFixed(2)} kW\n`;
  report += `   • Potencia de demanda: ${(result.totalPowerDemand / 1000).toFixed(2)} kW\n`;
  report += `   • Corriente: ${result.totalCurrent.toFixed(2)} A\n`;

  report += `\n3. CONDUCTOR:\n`;
  report += `   • Sección: ${result.cable.sectionLabel}\n`;
  report += `   • Caída de tensión: ${result.cable.voltageDrop.toFixed(2)}V (${result.cable.voltageDropPercent.toFixed(2)}%)\n`;
  report += `   • Estado: ${result.cable.acceptable ? '✓ Cumple normativa' : '✗ No cumple'}\n`;

  report += `\n4. PROTECCIONES:\n`;
  report += `   • Térmica: ${result.protection.breaker}A Curva ${result.protection.breakerType}\n`;
  report += `   • Diferencial: ${result.protection.rcd}A / ${result.protection.rcdSensitivity}mA\n`;

  report += `\n5. COSTOS OPERATIVOS:\n`;
  report += `   • Consumo diario: ${result.operatingCost.dailyKwh.toFixed(2)} kWh\n`;
  report += `   • Costo diario: $${result.operatingCost.dailyCost.toFixed(0)}\n`;
  report += `   • Costo mensual: $${result.operatingCost.monthlyCost.toFixed(0)}\n`;
  report += `   • Costo anual: $${result.operatingCost.annualCost.toFixed(0)}\n`;

  if (result.warnings.length > 0) {
    report += `\n⚠️ ADVERTENCIAS:\n`;
    result.warnings.forEach(w => report += `   • ${w}\n`);
  }

  if (result.errors.length > 0) {
    report += `\n❌ ERRORES:\n`;
    result.errors.forEach(e => report += `   • ${e}\n`);
  }

  return report;
}
