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