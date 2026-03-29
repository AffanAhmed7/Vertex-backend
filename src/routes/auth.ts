import { Router } from 'express';
import { AuthController } from '../controllers/auth.js';
import { UserController } from '../controllers/user.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';
import { prisma } from '../lib/prisma.js';

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
router.post('/verify-2fa', AuthController.verify2FA);

// Protected: Get current user profile
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.userId },
            select: { id: true, name: true, email: true, role: true, twoFactorEnabled: true, securityQuestion: true, securityAnswer: true },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const userData = {
            ...user,
            hasSecurityQuestion: !!(user.securityQuestion && user.securityAnswer),
            securityAnswer: undefined,
        };

        return res.json({ success: true, data: userData });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
});

router.get('/admin-only', authenticate, authorize(Role.ADMIN), (_req, res) => {
    res.json({ message: 'Welcome, Admin!', data: 'This is top secret data for admins only.' });
});

router.patch('/profile', authenticate, UserController.updateMe);
router.patch('/change-password', authenticate, UserController.changePassword);

export default router;
