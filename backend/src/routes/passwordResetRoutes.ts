import { Router } from 'express';
import { requestPasswordReset, resetPassword, verifyResetToken } from '../controllers/passwordResetController';

const router = Router();

// Solicitar reset de contraseña (envía email)
router.post('/request', requestPasswordReset);

// Verificar si un token es válido
router.get('/verify', verifyResetToken);

// Resetear contraseña con token
router.post('/reset', resetPassword);

export default router;
