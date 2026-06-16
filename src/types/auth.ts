// src/types/auth.ts

import { Request } from 'express';

export type AuthRequest = Request & {
  user?: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
  cookies?: any;
};