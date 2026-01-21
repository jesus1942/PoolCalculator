import { Router } from 'express';
import { authenticate, isSuperadmin } from '../middleware/auth';
import { getOpsStatus, listOpsLogs } from '../controllers/opsController';

const router = Router();

router.get('/status', authenticate, isSuperadmin, getOpsStatus);
router.get('/logs', authenticate, isSuperadmin, listOpsLogs);

export default router;
