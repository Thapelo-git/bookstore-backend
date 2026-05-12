import { Router } from 'express';
import { auth } from '../middleware/auth';
import {
  getOrCreateCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from '../controllers/cartController';

const router = Router();

router.get('/', auth, getOrCreateCart);
router.post('/', auth, addToCart);
router.put('/:bookId', auth, updateCartItem);
router.delete('/:bookId', auth, removeFromCart);
router.delete('/', auth, clearCart);

export default router;