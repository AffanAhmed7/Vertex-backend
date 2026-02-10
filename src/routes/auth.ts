import { Router } from 'express';
import { AuthController } from '../controllers/auth.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';
import { authLimiter } from '../middleware/security.js';

const router = Router();

// Public routes
router.post('/register', authLimiter, AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/verify', AuthController.verifyEmail);
router.post('/forgot-password', authLimiter, AuthController.forgotPassword);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

// Example protected routes
router.get('/me', authenticate, (_req, res) => {
    res.json({ user: _req.user });
});

router.get('/admin-only', authenticate, authorize(Role.ADMIN), (_req, res) => {
    res.json({ message: 'Welcome, Admin!', data: 'This is top secret data for admins only.' });
});

export default router;
