import { Router } from 'express';
import { createRequestLimiter } from '../middleware/httpSecurity';
import {
  getPublicTimeline,
  clientLogin,
  exportPublicTimeline,
  createPublicComment,
  listPublicComments,
} from '../controllers/projectShareController';

const router = Router();

// El enlace identifica una historia privada: no debe quedar en cachés compartidas ni índices.
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

// Rutas públicas (NO requieren autenticación de usuario)
router.post('/login', createRequestLimiter(30, 15 * 60 * 1000), clientLogin);
router.get('/:shareToken/export', exportPublicTimeline);
router.get('/:shareToken/comments', listPublicComments);
router.post('/:shareToken/comments', createRequestLimiter(20, 15 * 60 * 1000), createPublicComment);
router.get('/:shareToken', getPublicTimeline);

export default router;
