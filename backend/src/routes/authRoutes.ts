import express from 'express';
import { register, login } from '../controllers/authController';
import { googleAuth, googleAuthCallback } from '../controllers/googleAuthController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

export default router;
