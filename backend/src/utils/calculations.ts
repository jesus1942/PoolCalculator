/**
 * Utilidades para cálculos de piscinas
 */

export interface PoolDimensions {
  length: number;
  width: number;
  depth: number;
  depthEnd?: number;
  shape: 'RECTANGULAR' | 'CIRCULAR' | 'OVAL' | 'JACUZZI';
}

/**
 * Calcula el perímetro según la forma de la piscina
 */
export const calculatePerimeter = (dimensions: PoolDimensions): number => {
  const { length, width, shape } = dimensions;

  switch (shape) {
    case 'RECTANGULAR':
      return 2 * (length + width);
    
    case 'CIRCULAR':
      // Asumimos que length es el diámetro
      return Math.PI * length;
    
    case 'OVAL':
      // Fórmula aproximada de Ramanujan para elipse
      const a = length / 2;
      const b = width / 2;
      return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    
    case 'JACUZZI':
      // Similar a circular
      return Math.PI * length;
    
    default:
      return 2 * (length + width);
  }
};

/**
 * Calcula el área del espejo de agua
 */
export const calculateWaterMirrorArea = (dimensions: PoolDimensions): number => {
  const { length, width, shape } = dimensions;

  switch (shape) {
    case 'RECTANGULAR':
      return length * width;
    
    case 'CIRCULAR':
    case 'JACUZZI':
      const radius = length / 2;
      return Math.PI * radius * radius;
    
    case 'OVAL':
      const a = length / 2;
      const b = width / 2;
      return Math.PI * a * b;
    
    default:
      return length * width;
  }
};

/**
 * Calcula el volumen de agua
 */
export const calculateVolume = (dimensions: PoolDimensions): number => {
  const { depth, depthEnd, shape } = dimensions;
  const area = calculateWaterMirrorArea(dimensions);

  if (depthEnd && depthEnd !== depth) {
    // Profundidad variable - promedio
    const avgDepth = (depth + depthEnd) / 2;
    return area * avgDepth;
  }

  return area * depth;
};

/**
 * Calcula líneas de losetas por lado
 */
export const calculateTileLines = (
  sideLengthMeters: number,
  tileWidthMeters: number
): number => {
  return Math.ceil(sideLengthMeters / tileWidthMeters);
};

/**
 * Calcula área total de vereda (sin espejo de agua)
 */
export const calculateSidewalkArea = (
  totalArea: number,
  waterMirrorArea: number
): number => {
  return totalArea - waterMirrorArea;
};

/**
 * Calcula cantidad de losetas necesarias
 */
export const calculateTilesNeeded = (
  sidewalkArea: number,
  tileArea: number
): number => {
  // Agregar 10% de desperdicio
  return Math.ceil((sidewalkArea / tileArea) * 1.1);
};
