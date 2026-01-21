/**
 * Rutas para cálculos profesionales de sistemas hidráulicos y eléctricos
 */

import express from 'express';
import {
  getProfessionalCalculations,
  getHydraulicAnalysis,
  getElectricalAnalysis,
  getElectricalReport,
  validateSystemCompatibility
} from '../controllers/professionalCalculationsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * GET /api/professional-calculations/:projectId
 * Obtiene cálculos profesionales completos (hidráulico + eléctrico)
 *
 * Query params:
 * - distanceToEquipment: número (metros) - default: 5
 * - staticLift: número (metros) - default: 1.5
 * - voltage: 220 | 380 - default: 220
 * - installationType: 'AERIAL' | 'BURIED' | 'CONDUIT' - default: 'CONDUIT'
 * - ambientTemp: número (°C) - default: 25
 */
router.get('/:projectId', getProfessionalCalculations);

/**
 * GET /api/professional-calculations/:projectId/hydraulic
 * Obtiene solo análisis hidráulico
 *
 * Query params:
 * - distanceToEquipment: número (metros) - default: 5
 * - staticLift: número (metros) - default: 1.5
 */
router.get('/:projectId/hydraulic', getHydraulicAnalysis);

/**
 * GET /api/professional-calculations/:projectId/electrical
 * Obtiene solo análisis eléctrico
 *
 * Query params:
 * - distanceToPanel: número (metros) - default: 10
 * - voltage: 220 | 380 - default: 220
 * - installationType: 'AERIAL' | 'BURIED' | 'CONDUIT' - default: 'CONDUIT'
 * - ambientTemp: número (°C) - default: 25
 */
router.get('/:projectId/electrical', getElectricalAnalysis);

/**
 * GET /api/professional-calculations/:projectId/electrical-report
 * Genera reporte en texto del análisis eléctrico
 *
 * Query params: mismos que /electrical
 * Returns: text/plain
 */
router.get('/:projectId/electrical-report', getElectricalReport);

/**
 * POST /api/professional-calculations/:projectId/validate
 * Valida compatibilidad de componentes seleccionados
 *
 * Body:
 * {
 *   pumpId: string,
 *   filterId: string,
 *   distanceToEquipment?: number,
 *   staticLift?: number
 * }
 */
router.post('/:projectId/validate', validateSystemCompatibility);

export default router;
