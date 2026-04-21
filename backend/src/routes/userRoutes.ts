import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  listUsers,
  createUser,
  updateUser,
  getUserProjectAccess,
  updateUserProjectAccess,
} from '../controllers/userController';

const router = express.Router();

router.use(authenticate);
router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.get('/users/:id/project-access', getUserProjectAccess);
router.put('/users/:id/project-access/:projectId', updateUserProjectAccess);

export default router;
