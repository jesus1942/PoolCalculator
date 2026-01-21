import { Router } from 'express';
import { authenticate, isSuperadmin } from '../middleware/auth';
import { listOrganizations, switchOrganization, listAllOrganizations, createOrganization, updateOrganization } from '../controllers/organizationController';

const router = Router();

router.use(authenticate);
router.get('/', listOrganizations);
router.post('/switch', switchOrganization);
router.get('/admin', isSuperadmin, listAllOrganizations);
router.post('/', isSuperadmin, createOrganization);
router.patch('/:id', isSuperadmin, updateOrganization);

export default router;
