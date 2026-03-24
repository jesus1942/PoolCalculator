import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProfessionRoles,
  createProfessionRole,
  updateProfessionRole,
  deleteProfessionRole,
  applyReferenceLaborRates,
} from '../controllers/professionRoleController';

const router = express.Router();

router.get('/', authenticate, getProfessionRoles);
router.post('/apply-reference-rates', authenticate, applyReferenceLaborRates);
router.post('/', authenticate, createProfessionRole);
router.put('/:id', authenticate, updateProfessionRole);
router.delete('/:id', authenticate, deleteProfessionRole);

export default router;
