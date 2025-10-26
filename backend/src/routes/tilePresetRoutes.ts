import express from 'express';
import {
  createTilePreset,
  getTilePresets,
  updateTilePreset,
  deleteTilePreset,
} from '../controllers/tilePresetController';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/', getTilePresets);

router.use(authenticate);
router.use(isAdmin);

router.post('/', createTilePreset);
router.put('/:id', updateTilePreset);
router.delete('/:id', deleteTilePreset);

export default router;
