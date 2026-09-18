import express from 'express';
import {
  createEquipmentPreset,
  getEquipmentPresets,
  updateEquipmentPreset,
  deleteEquipmentPreset,
} from '../controllers/equipmentPresetController';
import { authenticate, isSuperadmin } from '../middleware/auth';

const router = express.Router();

router.get('/', getEquipmentPresets);

router.use(authenticate);
router.use(isSuperadmin);

router.post('/', createEquipmentPreset);
router.put('/:id', updateEquipmentPreset);
router.delete('/:id', deleteEquipmentPreset);

export default router;
