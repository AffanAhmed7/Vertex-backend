import { Router } from 'express';
import { submitContact } from '../controllers/contact.js';

const router = Router();

/**
 * Public Contact Route
 * @route POST /api/contact
 */
router.post('/', submitContact);

export default router;
