import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createOrUpdateShare,
  getShareConfig,
  deactivateShare,
  toggleUpdateVisibility,
  listProjectComments,
  replyToClientComment,
  deleteClientComment,
} from '../controllers/projectShareController';

const router = Router();

// Rutas protegidas (requieren autenticación del usuario)
router.patch('/update/:updateId/visibility', authenticate, toggleUpdateVisibility);
router.get('/comments/project/:projectId', authenticate, listProjectComments);
router.post('/comments/:commentId/reply', authenticate, replyToClientComment);
router.delete('/comments/:commentId', authenticate, deleteClientComment);
router.post('/:projectId', authenticate, createOrUpdateShare);
router.get('/:projectId', authenticate, getShareConfig);
router.delete('/:projectId', authenticate, deactivateShare);

export default router;
