import express from 'express';
import {
  createPoolPreset,
  getPoolPresets,
  getPoolPresetById,
  updatePoolPreset,
  deletePoolPreset,
  calculatePresetMeasurements,
} from '../controllers/poolPresetController';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/multer';

const router = express.Router();

// Rutas públicas (GET) - accesibles desde landing page
router.get('/', getPoolPresets);
router.get('/:id', getPoolPresetById);
router.get('/:id/calculate', calculatePresetMeasurements);

// Rutas protegidas (POST, PUT, DELETE) - requieren autenticación
router.post('/', authenticate, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 }
]), createPoolPreset);
router.put('/:id', authenticate, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 }
]), updatePoolPreset);
router.delete('/:id', authenticate, deletePoolPreset);

export default router;
