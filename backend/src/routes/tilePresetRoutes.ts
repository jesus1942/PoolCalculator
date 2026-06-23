import express from 'express';
import {
  createTilePreset,
  getTilePresets,
  updateTilePreset,
  deleteTilePreset,
} from '../controllers/tilePresetController';
import { authenticate } from '../middleware/auth';
import { canManageCatalog } from '../middleware/permissions';

const router = express.Router();

// Todas las rutas requieren autenticación: el catálogo se filtra según el tenant.
router.use(authenticate);

router.get('/', getTilePresets);
router.post('/', canManageCatalog, createTilePreset);
router.put('/:id', canManageCatalog, updateTilePreset);
router.delete('/:id', canManageCatalog, deleteTilePreset);

export default router;
