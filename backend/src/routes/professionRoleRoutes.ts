import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProfessionRoles,
  createProfessionRole,
  updateProfessionRole,
  deleteProfessionRole,
} from '../controllers/professionRoleController';

const router = express.Router();

router.get('/', authenticate, getProfessionRoles);
router.post('/', authenticate, createProfessionRole);
router.put('/:id', authenticate, updateProfessionRole);
router.delete('/:id', authenticate, deleteProfessionRole);

export default router;
