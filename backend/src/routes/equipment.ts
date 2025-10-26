import { Router } from 'express';
import { authenticate } from '../middleware/auth';
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
router.post('/', authenticate, createEquipment);
router.put('/:id', authenticate, updateEquipment);
router.delete('/:id', authenticate, deleteEquipment);

export default router;
