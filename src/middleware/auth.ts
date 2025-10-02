import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/book';
import BlacklistedToken from '../models/BlacklistedToken';
/**
 * Authentication middleware to verify JWT token
 * Adds user object to request if token is valid
 */
export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    const blacklistedToken = await BlacklistedToken.findOne({ token });
    if (blacklistedToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Token has been invalidated. Please login again.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = decoded.user;
    next();


  
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    // Handle different JWT errors
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.' 
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        success: false,
        message: 'Token has expired.' 
      });
    }

    res.status(401).json({ 
      success: false,
      message: 'Token is not valid.' 
    });
  }
};

/**
 * Admin authorization middleware
 * Must be used after auth middleware
 */
export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if user exists and is admin
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required.' 
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during authorization.' 
    });
  }
};

/**
 * Optional auth middleware - doesn't block request if no token
 * but still adds user to request if token is valid
 */
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('x-auth-token');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.user = decoded.user;
    }

    next();
  } catch (error) {
    // Continue even if token is invalid (optional auth)
    next();
  }
};