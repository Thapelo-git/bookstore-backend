import { Request, Response, NextFunction } from 'express';
import { BookCreateRequest } from '../types/book';

export const validateBook = (req: Request, res: Response, next: NextFunction) => {
  const { title, author, isbn, publishedYear }: BookCreateRequest = req.body;
  const errors: string[] = [];

  // Required field validation
  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  } else if (title.trim().length > 200) {
    errors.push('Title cannot exceed 200 characters');
  }

  if (!author || author.trim().length === 0) {
    errors.push('Author is required');
  } else if (author.trim().length > 100) {
    errors.push('Author name cannot exceed 100 characters');
  }

  if (!isbn) {
    errors.push('ISBN is required');
  } else if (!/^(?:\d{10}|\d{13})$/.test(isbn)) {
    errors.push('ISBN must be 10 or 13 digits');
  }

  if (!publishedYear) {
    errors.push('Published year is required');
  } else {
    const currentYear = new Date().getFullYear();
    if (publishedYear < 1000 || publishedYear > currentYear) {
      errors.push(`Published year must be between 1000 and ${currentYear}`);
    }
  }

  // Optional field validation
  if (req.body.genre && req.body.genre.length > 50) {
    errors.push('Genre cannot exceed 50 characters');
  }

  if (req.body.description && req.body.description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: errors.join(', ')
    });
  }

  next();
};