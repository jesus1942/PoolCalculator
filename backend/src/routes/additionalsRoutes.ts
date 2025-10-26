import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProjectAdditionals,
  processAdditionals,
  updateAdditional,
  deleteAdditional,
  getBusinessRules,
  updateBusinessRule
} from '../controllers/additionalsController';

const router = Router();

// Rutas de adicionales del proyecto
router.get('/project/:projectId', authenticate, getProjectAdditionals);
router.post('/project/:projectId/process', authenticate, processAdditionals);
router.put('/:id', authenticate, updateAdditional);
router.delete('/:id', authenticate, deleteAdditional);

// Rutas de reglas de negocio
router.get('/rules', authenticate, getBusinessRules);
router.put('/rules/:id', authenticate, updateBusinessRule);

export default router;
