import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth';
import { listUsers, createUser, updateUser } from '../controllers/userController';

const router = express.Router();

router.use(authenticate);
router.get('/users', isAdmin, listUsers);
router.post('/users', isAdmin, createUser);
router.patch('/users/:id', isAdmin, updateUser);

export default router;
