import express from 'express';
import {
  createEquipmentPreset,
  getEquipmentPresets,
  updateEquipmentPreset,
  deleteEquipmentPreset,
} from '../controllers/equipmentPresetController';
import { authenticate } from '../middleware/auth';
import { canManageCatalog } from '../middleware/permissions';

const router = express.Router();

// Todas las rutas requieren autenticación: el catálogo se filtra según el tenant.
router.use(authenticate);

router.get('/', getEquipmentPresets);
router.post('/', canManageCatalog, createEquipmentPreset);
router.put('/:id', canManageCatalog, updateEquipmentPreset);
router.delete('/:id', canManageCatalog, deleteEquipmentPreset);

export default router;
