import express from 'express';
import { authenticate } from '../middleware/auth';
import { canManageCatalog } from '../middleware/permissions';
import {
  getPlumbingItems,
  createPlumbingItem,
  updatePlumbingItem,
  deletePlumbingItem,
} from '../controllers/plumbingItemController';

const router = express.Router();

// Todas las rutas requieren autenticación: el catálogo se filtra según el tenant.
router.use(authenticate);

router.get('/', getPlumbingItems);
router.post('/', canManageCatalog, createPlumbingItem);
router.put('/:id', canManageCatalog, updatePlumbingItem);
router.delete('/:id', canManageCatalog, deletePlumbingItem);

export default router;
