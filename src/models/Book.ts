import mongoose, { Schema, Document } from 'mongoose';

export interface IBook extends Document {
  title: string;
  author: string;
  description?: string;
  price: number;
  originalPrice?: number;
  coverImage?: string;
  category?: string;
  stock: number;
  rating: number;
  reviewCount: number;
  publishedDate?: Date;
  isbn: string;
  pages?: number;
  language?: string;
  featured?: boolean;
  bestseller?: boolean;
  merchantId?: mongoose.Types.ObjectId;
  merchantName?: string;
}


const BookSchema: Schema = new Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },

  description: { type: String },

  price: { type: Number, required: true },

  originalPrice: { type: Number },

  coverImage: { type: String },

  category: { type: String },

  stock: { type: Number, default: 0 },

  rating: { type: Number, default: 0 },

  reviewCount: { type: Number, default: 0 },

  publishedDate: { type: Date },

  isbn: { type: String, required: true },

  pages: { type: Number },

  language: { type: String },

  featured: { type: Boolean, default: false },

  bestseller: { type: Boolean, default: false },

  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  merchantName: { type: String },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });


// Indexes for better performance
BookSchema.index({ title: 'text', author: 'text', description: 'text' });
BookSchema.index({ author: 1, publishedDate: -1 });
BookSchema.index({ isbn: 1, createdBy: 1 }, { unique: true });


export default mongoose.model<IBook>('Book', BookSchema);