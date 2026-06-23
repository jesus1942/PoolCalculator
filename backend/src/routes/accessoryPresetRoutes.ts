import express from 'express';
import {
  createAccessoryPreset,
  getAccessoryPresets,
  updateAccessoryPreset,
  deleteAccessoryPreset,
} from '../controllers/accessoryPresetController';
import { authenticate } from '../middleware/auth';
import { canManageCatalog } from '../middleware/permissions';

const router = express.Router();

// Todas las rutas requieren autenticación: el catálogo se filtra según el tenant.
router.use(authenticate);

router.get('/', getAccessoryPresets);
router.post('/', canManageCatalog, createAccessoryPreset);
router.put('/:id', canManageCatalog, updateAccessoryPreset);
router.delete('/:id', canManageCatalog, deleteAccessoryPreset);

export default router;
