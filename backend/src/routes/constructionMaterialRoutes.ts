import express from 'express';
import {
  createConstructionMaterial,
  getConstructionMaterials,
  updateConstructionMaterial,
  deleteConstructionMaterial,
} from '../controllers/constructionMaterialController';
import { authenticate, isAdmin } from '../middleware/auth';

const router = express.Router();

router.get('/', getConstructionMaterials);

router.use(authenticate);
router.use(isAdmin);

router.post('/', createConstructionMaterial);
router.put('/:id', updateConstructionMaterial);
router.delete('/:id', deleteConstructionMaterial);

export default router;
