import mongoose, { Schema, Document } from 'mongoose';

export interface IBook extends Document {
  title: string;
  author: string;
  isbn: string;
  publishedYear: number;
  available: boolean;
  genre?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BookSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name cannot exceed 100 characters']
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true,
    match: [/^(?:\d{10}|\d{13})$/, 'Please provide a valid ISBN (10 or 13 digits)']
  },
  publishedYear: {
    type: Number,
    required: [true, 'Published year is required'],
    min: [1000, 'Published year must be after 1000'],
    max: [new Date().getFullYear(), 'Published year cannot be in the future']
  },
  available: {
    type: Boolean,
    default: true
  },
  genre: {
    type: String,
    trim: true,
    maxlength: [50, 'Genre cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for better performance
BookSchema.index({ title: 'text', author: 'text', description: 'text' });
BookSchema.index({ author: 1, publishedYear: -1 });
BookSchema.index({ isbn: 1, createdBy: 1 }, { unique: true });
BookSchema.index({ available: 1 });

export default mongoose.model<IBook>('Book', BookSchema);