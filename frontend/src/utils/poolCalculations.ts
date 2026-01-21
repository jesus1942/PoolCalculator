/**
 * Algoritmos de cálculo para calefacción, filtración y mantenimiento de piscinas
 */

// ==================== CALEFACCIÓN ====================

export interface HeatingRecommendation {
  volumeM3: number;
  volumeLiters: number;
  btuRequired: number;
  kcalRequired: number;
  kwRequired: number;
  heatupTime: {
    gas: number; // horas
    electric: number; // horas
    heatPump: number; // horas
    solar: number; // horas
  };
  dailyOperationCost: {
    gas: number; // ARS
    electric: number; // ARS
    heatPump: number; // ARS
    solar: number; // ARS
  };
  recommendation: string;
  considerations: string[];
}

/**
 * Calcula los requisitos de calefacción para una piscina
 * @param volume Volumen de la piscina en m³
 * @param targetTemp Temperatura deseada del agua (°C)
 * @param ambientTemp Temperatura ambiente promedio (°C)
 * @param isIndoor Si la piscina está cubierta
 * @param hasCover Si tiene cobertor térmico
 */
export function calculateHeatingRequirements(
  volume: number,
  targetTemp: number = 28,
  ambientTemp: number = 15,
  isIndoor: boolean = false,
  hasCover: boolean = false
): HeatingRecommendation {
  const volumeLiters = volume * 1000;

  // Temperatura diferencial
  const tempDiff = targetTemp - ambientTemp;

  // Factor de pérdida de calor
  let lossFactor = 1.0;
  if (isIndoor) {
    lossFactor = 0.5; // Piscina cubierta pierde menos calor
  } else if (hasCover) {
    lossFactor = 0.7; // Cobertor reduce pérdidas
  }

  // Cálculo básico: 1 kcal eleva 1°C a 1 litro de agua
  // Más factores de pérdida por evaporación, radiación y conducción
  const baseKcal = volumeLiters * tempDiff;

  // Factor de seguridad y pérdidas (evaporación, viento, radiación)
  const evaporationLoss = isIndoor ? 1.1 : 1.3; // 10-30% de pérdida
  const totalKcal = baseKcal * lossFactor * evaporationLoss;

  // Conversiones
  const btuRequired = totalKcal * 3.96832; // 1 kcal = 3.96832 BTU
  const kwRequired = totalKcal * 0.001163; // 1 kcal = 0.001163 kW

  // Cálculo de tiempo de calentamiento
  // Potencias típicas de diferentes sistemas
  const gasPower = 50000; // BTU/h para caldera de gas
  const electricPower = 15; // kW para calentador eléctrico
  const heatPumpPower = 12; // kW para bomba de calor
  const solarPower = 8; // kW equivalente para sistema solar (depende de sol)

  const heatupTime = {
    gas: btuRequired / gasPower,
    electric: (kwRequired / electricPower),
    heatPump: (kwRequired / heatPumpPower),
    solar: (kwRequired / solarPower) * 1.5 // Solar es más lento
  };

  // Costos operativos diarios (ARS - valores aproximados 2024)
  // Asumiendo 8 horas de operación para mantener temperatura
  const gasCostPerM3 = 150; // ARS por m³ de gas
  const electricCostPerKwh = 50; // ARS por kWh
  const gasPowerKw = gasPower * 0.000293071; // BTU/h a kW

  const dailyOperationCost = {
    gas: (gasPowerKw / 10) * gasCostPerM3 * 8, // Eficiencia ~90%
    electric: electricPower * electricCostPerKwh * 8,
    heatPump: (heatPumpPower / 3) * electricCostPerKwh * 8, // COP ~3
    solar: 0 // Sin costo operativo (solo inversión inicial)
  };

  // Recomendación basada en volumen
  let recommendation = '';
  let considerations: string[] = [];

  if (volume < 30) {
    recommendation = 'Para piscinas pequeñas, recomendamos calentador eléctrico o bomba de calor compacta.';
    considerations = [
      'Calentador eléctrico: Rápido pero mayor costo operativo',
      'Bomba de calor: Eficiente, ideal para uso frecuente',
      'Sistema solar: Económico a largo plazo si hay buena exposición solar'
    ];
  } else if (volume < 60) {
    recommendation = 'Para piscinas medianas, recomendamos bomba de calor o sistema mixto.';
    considerations = [
      'Bomba de calor: Mejor relación eficiencia/costo',
      'Sistema solar + eléctrico: Combine ahorro con respaldo',
      'Caldera a gas: Si ya tiene instalación de gas'
    ];
  } else {
    recommendation = 'Para piscinas grandes, recomendamos caldera a gas o sistema solar con respaldo.';
    considerations = [
      'Caldera a gas: Alta potencia, ideal para calentamiento rápido',
      'Sistema solar + bomba de calor: Máximo ahorro energético',
      'Considere cobertor térmico para reducir pérdidas un 70%'
    ];
  }

  // Consideraciones adicionales
  if (!hasCover) {
    considerations.push('IMPORTANTE: Un cobertor térmico puede reducir costos hasta 70%');
  }

  if (!isIndoor && ambientTemp < 15) {
    considerations.push('ADVERTENCIA: Con temperatura ambiente baja, el tiempo de calentamiento aumentará significativamente');
  }

  return {
    volumeM3: volume,
    volumeLiters,
    btuRequired,
    kcalRequired: totalKcal,
    kwRequired,
    heatupTime,
    dailyOperationCost,
    recommendation,
    considerations
  };
}

// ==================== FILTRACIÓN ====================

export interface FilterRecommendation {
  volumeM3: number;
  requiredFlowRate: number; // m³/h
  recommendedFilterType: string;
  filterSize: {
    diameter: number; // pulgadas
    area: number; // m²
  };
  mediaLoad: {
    sand: number; // kg
    gravel: number; // kg
  };
  pumpPower: {
    hp: number;
    watts: number;
  };
  circulationTime: number; // horas por día
  backwashFrequency: string;
  recommendations: string[];
}

/**
 * Calcula los requisitos de filtración para una piscina
 * @param volume Volumen de la piscina en m³
 * @param usage Intensidad de uso: 'low' | 'medium' | 'high'
 */
export function calculateFilterRequirements(
  volume: number,
  usage: 'low' | 'medium' | 'high' = 'medium'
): FilterRecommendation {
  // Tiempo de circulación según uso
  const circulationHours = {
    low: 6,
    medium: 8,
    high: 10
  };

  const circulationTime = circulationHours[usage];

  // Caudal necesario: Todo el volumen debe circular en el tiempo especificado
  // Más un 20% de margen de seguridad
  const requiredFlowRate = (volume / circulationTime) * 1.2;

  // Determinar tipo y tamaño de filtro
  let recommendedFilterType = '';
  let filterDiameter = 0; // pulgadas
  let sandLoad = 0; // kg
  let gravelLoad = 0; // kg
  let pumpHp = 0;

  if (requiredFlowRate <= 10) {
    recommendedFilterType = 'Filtro de arena de 18"';
    filterDiameter = 18;
    sandLoad = 50;
    gravelLoad = 25;
    pumpHp = 0.5;
  } else if (requiredFlowRate <= 15) {
    recommendedFilterType = 'Filtro de arena de 21"';
    filterDiameter = 21;
    sandLoad = 80;
    gravelLoad = 40;
    pumpHp = 0.75;
  } else if (requiredFlowRate <= 20) {
    recommendedFilterType = 'Filtro de arena de 24"';
    filterDiameter = 24;
    sandLoad = 120;
    gravelLoad = 60;
    pumpHp = 1.0;
  } else if (requiredFlowRate <= 30) {
    recommendedFilterType = 'Filtro de arena de 28"';
    filterDiameter = 28;
    sandLoad = 180;
    gravelLoad = 90;
    pumpHp = 1.5;
  } else if (requiredFlowRate <= 40) {
    recommendedFilterType = 'Filtro de arena de 32"';
    filterDiameter = 32;
    sandLoad = 250;
    gravelLoad = 125;
    pumpHp = 2.0;
  } else {
    recommendedFilterType = 'Sistema de filtración múltiple o filtro industrial';
    filterDiameter = 36;
    sandLoad = 350;
    gravelLoad = 175;
    pumpHp = 3.0;
  }

  // Calcular área del filtro (aproximado)
  const filterArea = Math.PI * Math.pow((filterDiameter * 0.0254) / 2, 2); // m²

  // Potencia de la bomba en watts
  const pumpWatts = pumpHp * 745.7; // 1 HP = 745.7 W

  // Frecuencia de retrolavado
  let backwashFrequency = '';
  if (usage === 'low') {
    backwashFrequency = 'Cada 2-3 semanas';
  } else if (usage === 'medium') {
    backwashFrequency = 'Cada 1-2 semanas';
  } else {
    backwashFrequency = 'Semanal o cuando la presión aumente 0.5 bar';
  }

  // Recomendaciones
  const recommendations = [
    `Caudal requerido: ${requiredFlowRate.toFixed(1)} m³/h`,
    `Tiempo de circulación: ${circulationTime} horas diarias`,
    `La bomba debe circular todo el volumen en ${circulationTime} horas`,
    'Use arena de sílice de 0.5-1.0mm de granulometría',
    'Coloque grava de soporte de 3-5mm en el fondo del filtro',
    `Retrolavado: ${backwashFrequency}`,
    'Verifique presión del manómetro regularmente',
    'Limpie el pre-filtro de la bomba semanalmente'
  ];

  if (volume > 50) {
    recommendations.push('NOTA: Para piscinas grandes, considere sistema de filtración de alta eficiencia o cartucho');
  }

  if (usage === 'high') {
    recommendations.push('IMPORTANTE: Alto uso requiere mantenimiento frecuente y posible sistema de filtración auxiliar');
  }

  return {
    volumeM3: volume,
    requiredFlowRate,
    recommendedFilterType,
    filterSize: {
      diameter: filterDiameter,
      area: filterArea
    },
    mediaLoad: {
      sand: sandLoad,
      gravel: gravelLoad
    },
    pumpPower: {
      hp: pumpHp,
      watts: pumpWatts
    },
    circulationTime,
    backwashFrequency,
    recommendations
  };
}

// ==================== MANTENIMIENTO DEL AGUA ====================

export interface WaterMaintenanceGuide {
  volumeM3: number;
  volumeLiters: number;
  chemicals: {
    name: string;
    purpose: string;
    dosage: string;
    frequency: string;
    annualCost: number; // ARS
  }[];
  waterParameters: {
    parameter: string;
    idealRange: string;
    testFrequency: string;
    adjustMethod: string;
  }[];
  seasonalTips: {
    season: string;
    tips: string[];
  }[];
  annualMaintenanceCost: number;
  weeklyChecklist: string[];
  monthlyChecklist: string[];
}

/**
 * Genera una guía completa de mantenimiento del agua
 * @param volume Volumen de la piscina en m³
 * @param filterType Tipo de filtro instalado
 */
export function generateWaterMaintenanceGuide(
  volume: number,
  filterType: string = 'Arena'
): WaterMaintenanceGuide {
  const volumeLiters = volume * 1000;

  // Dosificación de químicos (valores por 10m³)
  const chlorineDosage = (volume / 10) * 200; // gramos de cloro granulado por semana
  const phMinusDosage = (volume / 10) * 100; // gramos por ajuste
  const phPlusDosage = (volume / 10) * 100; // gramos por ajuste
  const algaecideDosage = (volume / 10) * 50; // ml por semana
  const clarifierDosage = (volume / 10) * 30; // ml por semana
  const stabilizerDosage = (volume / 10) * 50; // gramos inicial

  // Químicos necesarios
  const chemicals = [
    {
      name: 'Cloro granulado o pastillas',
      purpose: 'Desinfección y eliminación de bacterias, algas y microorganismos',
      dosage: `${chlorineDosage.toFixed(0)}g semanales (mantener 1-3 ppm)`,
      frequency: '2-3 veces por semana',
      annualCost: chlorineDosage * 52 * 0.8 // $0.80 por gramo aprox
    },
    {
      name: 'pH Menos (ácido)',
      purpose: 'Reducir el pH cuando está por encima de 7.6',
      dosage: `${phMinusDosage.toFixed(0)}g por ajuste`,
      frequency: 'Según necesidad (test 2-3 veces/semana)',
      annualCost: phMinusDosage * 20 * 0.5 // ~20 ajustes al año
    },
    {
      name: 'pH Más (alcalino)',
      purpose: 'Aumentar el pH cuando está por debajo de 7.2',
      dosage: `${phPlusDosage.toFixed(0)}g por ajuste`,
      frequency: 'Según necesidad (test 2-3 veces/semana)',
      annualCost: phPlusDosage * 15 * 0.5 // ~15 ajustes al año
    },
    {
      name: 'Alguicida',
      purpose: 'Prevenir y eliminar algas',
      dosage: `${algaecideDosage.toFixed(0)}ml semanales`,
      frequency: 'Semanal (quincenal en invierno)',
      annualCost: algaecideDosage * 45 * 1.2 // ~45 semanas al año
    },
    {
      name: 'Clarificante',
      purpose: 'Aglomerar partículas finas para mejorar filtración',
      dosage: `${clarifierDosage.toFixed(0)}ml semanales`,
      frequency: 'Semanal o según turbidez',
      annualCost: clarifierDosage * 40 * 1.5
    },
    {
      name: 'Estabilizador (ácido cianúrico)',
      purpose: 'Proteger el cloro de la degradación por rayos UV',
      dosage: `${stabilizerDosage.toFixed(0)}g inicial (30-50 ppm)`,
      frequency: 'Una vez al año o después de vaciado',
      annualCost: stabilizerDosage * 2 * 0.6
    },
    {
      name: 'Anticalcáreo',
      purpose: 'Prevenir incrustaciones de cal en equipos y superficies',
      dosage: 'Según dureza del agua',
      frequency: 'Mensual',
      annualCost: 3000 // costo anual estimado
    }
  ];

  // Parámetros del agua
  const waterParameters = [
    {
      parameter: 'pH',
      idealRange: '7.2 - 7.6',
      testFrequency: '2-3 veces por semana',
      adjustMethod: 'pH Menos si >7.6, pH Más si <7.2'
    },
    {
      parameter: 'Cloro libre',
      idealRange: '1.0 - 3.0 ppm',
      testFrequency: '2-3 veces por semana',
      adjustMethod: 'Agregar cloro granulado o pastillas'
    },
    {
      parameter: 'Alcalinidad total',
      idealRange: '80 - 120 ppm',
      testFrequency: 'Semanal',
      adjustMethod: 'Bicarbonato de sodio para aumentar, ácido muriático para reducir'
    },
    {
      parameter: 'Dureza cálcica',
      idealRange: '200 - 400 ppm',
      testFrequency: 'Mensual',
      adjustMethod: 'Cloruro de calcio para aumentar, dilución con agua blanda para reducir'
    },
    {
      parameter: 'Estabilizador (CYA)',
      idealRange: '30 - 50 ppm',
      testFrequency: 'Mensual',
      adjustMethod: 'Ácido cianúrico para aumentar, dilución para reducir'
    },
    {
      parameter: 'Turbidez',
      idealRange: 'Agua cristalina',
      testFrequency: 'Diaria (visual)',
      adjustMethod: 'Clarificante, ajuste de pH, retrolavado de filtro'
    }
  ];

  // Consejos estacionales
  const seasonalTips = [
    {
      season: 'Verano (Dic-Feb)',
      tips: [
        'Aumente frecuencia de cloración por mayor uso y temperatura',
        'Revise cloro diariamente, la evaporación es mayor',
        'Limpie skimmers y pre-filtros más frecuentemente',
        'Considere choque de cloro semanal si hay alto uso',
        'Aumente tiempo de filtración a 10-12 horas/día',
        'Revise nivel de agua por evaporación'
      ]
    },
    {
      season: 'Otoño (Mar-May)',
      tips: [
        'Reduzca gradualmente la cloración',
        'Mantenga pH estable para preparar el invierno',
        'Limpie a fondo filtros y equipos',
        'Retire hojas y residuos con mayor frecuencia',
        'Considere cobertor para reducir ensuciamiento',
        'Tiempo de filtración: 8 horas/día'
      ]
    },
    {
      season: 'Invierno (Jun-Ago)',
      tips: [
        'Reduzca cloración a mínimo mantenimiento',
        'Filtre 4-6 horas/día',
        'Realice choque de cloro mensual',
        'Use cobertor de invierno',
        'Proteja equipos de heladas',
        'Revise químicos cada 2 semanas',
        'Considere hibernación si no usará la piscina'
      ]
    },
    {
      season: 'Primavera (Sep-Nov)',
      tips: [
        'Prepare la piscina para la temporada',
        'Realice choque de cloro intensivo',
        'Limpie a fondo filtro, paredes y fondo',
        'Ajuste todos los parámetros químicos',
        'Revise funcionamiento de todos los equipos',
        'Aumente gradualmente tiempo de filtración',
        'Considere tratamiento anti-algas preventivo'
      ]
    }
  ];

  // Checklist semanal
  const weeklyChecklist = [
    '✓ Testear pH y cloro (2-3 veces)',
    '✓ Agregar cloro según lectura',
    '✓ Limpiar skimmers y pre-filtro de bomba',
    '✓ Aspirar fondo si hay suciedad',
    '✓ Cepillar paredes',
    '✓ Agregar alguicida',
    '✓ Revisar nivel de agua',
    '✓ Verificar presión del filtro',
    '✓ Inspeccionar visualmente claridad del agua'
  ];

  // Checklist mensual
  const monthlyChecklist = [
    '✓ Test completo de agua (alcalinidad, dureza, estabilizador)',
    '✓ Retrolavado del filtro',
    '✓ Limpieza profunda de filtro',
    '✓ Choque de cloro (cloración intensiva)',
    '✓ Revisar y limpiar sistema de drenaje',
    '✓ Inspeccionar boquillas de retorno y aspiración',
    '✓ Limpiar línea de flotación',
    '✓ Revisar funcionamiento de equipos (bomba, calentador)',
    '✓ Agregar anticalcáreo',
    '✓ Registrar costos de químicos'
  ];

  // Costo anual total
  const annualMaintenanceCost = chemicals.reduce((sum, chem) => sum + chem.annualCost, 0);

  return {
    volumeM3: volume,
    volumeLiters,
    chemicals,
    waterParameters,
    seasonalTips,
    annualMaintenanceCost,
    weeklyChecklist,
    monthlyChecklist
  };
}
