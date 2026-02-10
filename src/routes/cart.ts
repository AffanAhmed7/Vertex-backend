import { Router } from 'express';
import { CartController } from '../controllers/cart.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

router.get('/', CartController.getCart);
router.post('/', CartController.addItem);
router.put('/:productId', CartController.updateItem);
router.delete('/:productId', CartController.removeItem);

export default router;
