import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth';
import {
  getPlumbingItems,
  createPlumbingItem,
  updatePlumbingItem,
  deletePlumbingItem,
} from '../controllers/plumbingItemController';

const router = express.Router();

router.get('/', getPlumbingItems);
router.post('/', authenticate, isAdmin, createPlumbingItem);
router.put('/:id', authenticate, isAdmin, updatePlumbingItem);
router.delete('/:id', authenticate, isAdmin, deletePlumbingItem);

export default router;
