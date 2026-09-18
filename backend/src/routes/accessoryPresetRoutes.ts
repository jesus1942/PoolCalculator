import express from 'express';
import {
  createAccessoryPreset,
  getAccessoryPresets,
  updateAccessoryPreset,
  deleteAccessoryPreset,
} from '../controllers/accessoryPresetController';
import { authenticate, isSuperadmin } from '../middleware/auth';

const router = express.Router();

router.get('/', getAccessoryPresets);

router.use(authenticate);
router.use(isSuperadmin);

router.post('/', createAccessoryPreset);
router.put('/:id', updateAccessoryPreset);
router.delete('/:id', deleteAccessoryPreset);

export default router;
