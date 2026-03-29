import { Router } from 'express';
import { SettingsController } from '../controllers/settings.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../types/auth.js';

const router = Router();

// Only Admins can access/modify settings
router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/', SettingsController.getSettings);
router.patch('/', SettingsController.updateSettings);
router.post('/reset', SettingsController.factoryReset);

export default router;
