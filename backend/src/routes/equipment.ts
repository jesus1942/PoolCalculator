import { Router } from 'express';
import { authenticate, isSuperadmin } from '../middleware/auth';
import {
  getEquipmentRecommendations,
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
} from '../controllers/equipmentController';

const router = Router();

// Rutas públicas (autenticadas)
router.get('/recommendations', authenticate, getEquipmentRecommendations);
router.get('/', authenticate, getAllEquipment);
router.get('/:id', authenticate, getEquipmentById);

// Rutas de administración (solo admin)
router.post('/', authenticate, isSuperadmin, createEquipment);
router.put('/:id', authenticate, isSuperadmin, updateEquipment);
router.delete('/:id', authenticate, isSuperadmin, deleteEquipment);

export default router;
