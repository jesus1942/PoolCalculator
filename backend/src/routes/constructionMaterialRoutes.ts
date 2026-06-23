import express from 'express';
import {
  createConstructionMaterial,
  getConstructionMaterials,
  updateConstructionMaterial,
  deleteConstructionMaterial,
} from '../controllers/constructionMaterialController';
import { authenticate } from '../middleware/auth';
import { canManageCatalog } from '../middleware/permissions';

const router = express.Router();

// Todas las rutas requieren autenticación: el catálogo se filtra según el tenant.
router.use(authenticate);

router.get('/', getConstructionMaterials);
router.post('/', canManageCatalog, createConstructionMaterial);
router.put('/:id', canManageCatalog, updateConstructionMaterial);
router.delete('/:id', canManageCatalog, deleteConstructionMaterial);

export default router;
