import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createOrUpdateShare,
  getShareConfig,
  deactivateShare,
  toggleUpdateVisibility,
} from '../controllers/projectShareController';

const router = Router();

// Rutas protegidas (requieren autenticación del usuario)
router.post('/:projectId', authenticate, createOrUpdateShare);
router.get('/:projectId', authenticate, getShareConfig);
router.delete('/:projectId', authenticate, deactivateShare);
router.patch('/update/:updateId/visibility', authenticate, toggleUpdateVisibility);

export default router;
