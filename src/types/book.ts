import { Request } from 'express';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface IBook {
  _id?: string;
  title: string;
  author: string;
  isbn: string;
  publishedYear: number;
  available: boolean;
  genre?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy: string;
}

export interface BookCreateRequest {
  title: string;
  author: string;
  isbn: string;
  publishedYear: number;
  available: boolean;
  genre?: string;
  description?: string;
}

export interface BookUpdateRequest extends Partial<BookCreateRequest> {}

export interface BookResponse {
  success: boolean;
  data?: IBook | IBook[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface BookQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  author?: string;
  available?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name:string;
     _id?: any; 
  };
  resource?: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role?: string;
}
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}