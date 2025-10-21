import { Request, Response } from 'express';

import Book from '../models/Book';
import { AuthRequest } from '../types/book';
export class BookController {
 
async getBooks(req: AuthRequest, res: Response) {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      author,
      available,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query object
    const query: any = {createdBy: req.user?.id};

    // FIXED: Proper search functionality
    if (search && typeof search === 'string') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { genre: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by author (exact match)
    if (author && typeof author === 'string') {
      query.author = { $regex: author, $options: 'i' };
    }

    // Filter by availability
    if (available !== undefined) {
      query.available = available === 'true';
    }

    // Type-safe sorting
    const sortOptions: any = {};
    const sortField = typeof sortBy === 'string' ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    sortOptions[sortField] = sortDirection;

    // Execute query with pagination
    const books = await Book.find(query)
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    // Get total count for pagination
    const total = await Book.countDocuments(query);

    res.status(200).json({
      success: true,
      data: books,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      message: books.length === 0 ? 'No books found' : 'Books retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching books'
    });
  }
}

  // GET /api/books/:id - Get single book
  async getBook(req: AuthRequest, res: Response) {
    try {
      const book = await Book.findById({_id:req.params.id,createdBy: req.user?.id });
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }
      res.status(200).json({
        success: true,
        data: book
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching book'
      });
    }
  }

  // POST /api/books - Create book
  async createBook(req: AuthRequest, res: Response) {
    try {
       if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
      const { title, author, isbn, publishedYear } = req.body;
      
      if (!title || !author || !isbn || !publishedYear) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: title, author, isbn, and publishedYear are required'
        });
      }

      // ✅ Check if ISBN already exists for this user
      const existingBook = await Book.findOne({ 
        isbn: isbn.trim(), 
        createdBy: req.user?.id 
      });
      
      if (existingBook) {
        return res.status(400).json({
          success: false,
          message: 'You already have a book with this ISBN'
        });
      }

      // Create book with user ownership
      const bookData = {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        publishedYear: parseInt(publishedYear),
        available: req.body.available !== undefined ? req.body.available : true,
        genre: req.body.genre || '',
        description: req.body.description || '',
        createdBy: req.user?.id // ✅ Set user ownership
      };
      const book = new Book(bookData);
      const savedBook = await book.save();
      console.log('✅ Book saved successfully:', savedBook);
      res.status(201).json({
        success: true,
        data: savedBook,
        message: 'Book created successfully'
      });
    } catch (error: any) {

        // More specific error handling
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: `Validation error: ${error.message}`
    });
  } else if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'A book with this ISBN already exists'
    });
  }
      res.status(500).json({
        success: false,
        message: 'Error creating book'+ error.message
      });
    }
  }

  // PUT /api/books/:id - Update book
  async updateBook(req: AuthRequest, res: Response) {
    try {
      const book = await Book.findByIdAndUpdate({_id:req.params.id,createdBy: req.user?.id }, req.body, { new: true,runValidators:true });
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }
      res.status(200).json({
        success: true,
        data: book,
        message: 'Book updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating book'
      });
    }
  }

  // DELETE /api/books/:id - Delete book
  async deleteBook(req: AuthRequest, res: Response) {
    try {
      const book = await Book.findByIdAndDelete({_id:req.params.id,createdBy: req.user?.id });
      if (!book) {
        return res.status(404).json({
          success: false,
          message: 'Book not found'
        });
      }
      res.status(200).json({
        success: true,
        message: 'Book deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting book'
      });
    }
  }
  async getBookStats(req: AuthRequest, res: Response) {
    try {
      const stats = await Book.aggregate([
        { $match: { createdBy: req.user?.id } },
        {
          $group: {
            _id: null,
            totalBooks: { $sum: 1 },
            availableBooks: { $sum: { $cond: ['$available', 1, 0] } },
            unavailableBooks: { $sum: { $cond: ['$available', 0, 1] } },
            genres: { $addToSet: '$genre' }
          }
        }
      ]);

      const result = stats[0] || {
        totalBooks: 0,
        availableBooks: 0,
        unavailableBooks: 0,
        genres: []
      };

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting book stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting book statistics'
      });
    }
  }

}

export default new BookController();