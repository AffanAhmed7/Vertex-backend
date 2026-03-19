import { Router } from 'express';
import { AuthController } from '../controllers/auth.js';
import { UserController } from '../controllers/user.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';

const router = Router();

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/verify', AuthController.verifyEmail);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/google', AuthController.googleAuth);

// Example protected routes
router.get('/me', authenticate, (_req, res) => {
    res.json({ user: _req.user });
});

router.get('/admin-only', authenticate, authorize(Role.ADMIN), (_req, res) => {
    res.json({ message: 'Welcome, Admin!', data: 'This is top secret data for admins only.' });
});

router.patch('/profile', authenticate, UserController.updateMe);

export default router;
