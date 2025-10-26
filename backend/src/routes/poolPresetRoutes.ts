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

router.use(authenticate);

router.post('/', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 }
]), createPoolPreset);
router.get('/', getPoolPresets);
router.get('/:id', getPoolPresetById);
router.put('/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'additionalImages', maxCount: 5 }
]), updatePoolPreset);
router.delete('/:id', deletePoolPreset);
router.get('/:id/calculate', calculatePresetMeasurements);

export default router;
