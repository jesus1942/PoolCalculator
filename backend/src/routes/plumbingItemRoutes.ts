import express from 'express';
import { authenticate, isSuperadmin } from '../middleware/auth';
import {
  getPlumbingItems,
  createPlumbingItem,
  updatePlumbingItem,
  deletePlumbingItem,
} from '../controllers/plumbingItemController';

const router = express.Router();

router.get('/', getPlumbingItems);
router.post('/', authenticate, isSuperadmin, createPlumbingItem);
router.put('/:id', authenticate, isSuperadmin, updatePlumbingItem);
router.delete('/:id', authenticate, isSuperadmin, deletePlumbingItem);

export default router;
