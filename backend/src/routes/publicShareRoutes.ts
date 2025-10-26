import { Router } from 'express';
import { getPublicTimeline, clientLogin } from '../controllers/projectShareController';

const router = Router();

// Rutas públicas (NO requieren autenticación de usuario)
router.post('/login', clientLogin);
router.get('/:shareToken', getPublicTimeline);

export default router;
