import { Router } from 'express';
import bookController from '../controllers/bookController';
import { auth } from '../middleware/auth';

const router = Router();
router.use(auth);
// GET routes
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBook);

router.get('/stats', bookController.getBookStats);
// POST routes  
router.post('/', bookController.createBook);

// PUT routes
router.put('/:id', bookController.updateBook);

// DELETE routes
router.delete('/:id', bookController.deleteBook);

export default router;