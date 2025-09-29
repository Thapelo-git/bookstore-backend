import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Book from '../models/Book';

export class BookController {
  // GET /api/books - List all books
 // In the getBooks method, fix the search logic:
async getBooks(req: Request, res: Response) {
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
    const query: any = {};

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
  async getBook(req: Request, res: Response) {
    try {
      const book = await Book.findById(req.params.id);
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
  async createBook(req: Request, res: Response) {
    try {
      const book = new Book(req.body);
      const savedBook = await book.save();
      res.status(201).json({
        success: true,
        data: savedBook,
        message: 'Book created successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Error creating book'
      });
    }
  }

  // PUT /api/books/:id - Update book
  async updateBook(req: Request, res: Response) {
    try {
      const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
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
  async deleteBook(req: Request, res: Response) {
    try {
      const book = await Book.findByIdAndDelete(req.params.id);
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
}

export default new BookController();