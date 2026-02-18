import { Router } from 'express';
import bookController from '../controllers/bookController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', bookController.getBooks);
router.get('/stats', bookController.getBookStats);
router.get('/:id', bookController.getBook);

router.post('/', auth, bookController.createBook);
router.put('/:id', auth, bookController.updateBook);
router.delete('/:id', auth, bookController.deleteBook);


export default router;