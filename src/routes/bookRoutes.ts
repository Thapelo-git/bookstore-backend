import { Router } from 'express';
import bookController from '../controllers/bookController';

const router = Router();

// GET routes
router.get('/', bookController.getBooks);
router.get('/:id', bookController.getBook);

// POST routes  
router.post('/', bookController.createBook);

// PUT routes
router.put('/:id', bookController.updateBook);

// DELETE routes
router.delete('/:id', bookController.deleteBook);

export default router;