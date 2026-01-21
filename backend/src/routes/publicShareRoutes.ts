import { Router } from 'express';
import { getPublicTimeline, clientLogin, exportPublicTimeline } from '../controllers/projectShareController';

const router = Router();

// Rutas públicas (NO requieren autenticación de usuario)
router.post('/login', clientLogin);
router.get('/:shareToken/export', exportPublicTimeline);
router.get('/:shareToken', getPublicTimeline);

export default router;
