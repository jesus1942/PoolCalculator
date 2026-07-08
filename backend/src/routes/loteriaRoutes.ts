import { Router, Response } from 'express';
import { authenticate, isSuperadmin, AuthRequest } from '../middleware/auth';
import { obtenerUltimosSorteos } from '../services/loteriaService';

// Pestaña privada del superadmin: últimos sorteos de Quini 6 y Loto Plus.
const router = Router();

router.get('/ultimos', authenticate, isSuperadmin, async (req: AuthRequest, res: Response) => {
  try {
    const forzar = req.query.refresh === '1';
    const data = await obtenerUltimosSorteos(forzar);
    res.json(data);
  } catch (error) {
    console.error('Error al obtener sorteos de lotería:', error);
    res.status(500).json({ error: 'No se pudieron obtener los sorteos' });
  }
});

export default router;
