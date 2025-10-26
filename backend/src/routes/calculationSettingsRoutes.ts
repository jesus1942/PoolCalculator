import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getCalculationSettings,
  updateCalculationSettings,
} from '../controllers/calculationSettingsController';

const router = express.Router();

router.get('/', authenticate, getCalculationSettings);
router.put('/', authenticate, updateCalculationSettings);

export default router;
