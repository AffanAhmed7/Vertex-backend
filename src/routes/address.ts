import { Router } from 'express';
import { AddressController } from '../controllers/address.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All address routes require authentication
router.use(authenticate);

router.get('/', AddressController.getAddresses);
router.post('/', AddressController.createAddress);
router.patch('/:id', AddressController.updateAddress);
router.delete('/:id', AddressController.deleteAddress);
router.patch('/:id/default', AddressController.setDefault);

export default router;
