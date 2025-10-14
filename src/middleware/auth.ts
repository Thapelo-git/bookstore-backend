import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/book';
import BlacklistedToken from '../models/BlacklistedToken';
import { User } from '../models';
/**
 * Authentication middleware to verify JWT token
 * Adds user object to request if token is valid
 */
const activeSessions = new Map();
export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
 
  try {
    // ✅ Check multiple token sources: Header, Cookie, or Body
    let token = req.header('Authorization');
    
    if (!token && req.cookies?.token) {
      token = `Bearer ${req.cookies.token}`;
    }
    
    if (!token && req.body?.token) {
      token = `Bearer ${req.body.token}`;
    }

    console.log('🔐 Auth Middleware - Token sources:', {
      header: !!req.header('Authorization'),
      cookie: !!req.cookies?.token,
      body: !!req.body?.token,
      finalToken: token ? 'FOUND' : 'NOT FOUND'
    });

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    if (!token.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token format. Use Bearer token.' 
      });
    }

    const actualToken = token.replace('Bearer ', '').trim();
    
    if (!actualToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    // ✅ Check if token is blacklisted
    const blacklistedToken = await BlacklistedToken.findOne({ token: actualToken });
    if (blacklistedToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Token has been invalidated. Please login again.' 
      });
    }

    // ✅ Verify JWT token
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET!) as any;
    
    // ✅ Check session (optional - for enhanced security)
    const session = activeSessions.get(decoded.user.id);
    if (session && session.token !== actualToken) {
      return res.status(401).json({ 
        success: false,
        message: 'Session expired. Please login again.' 
      });
    }

    // ✅ Get fresh user data
    const user = await User.findById(decoded.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found.' 
      });
    }

    // ✅ Add user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name:user.name
     
    };

    console.log('✅ User authenticated:', req.user.email);
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    
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

// ✅ Enhanced session management
export const createSession = (userId: string, token: string) => {
  activeSessions.set(userId, {
    token,
    createdAt: new Date(),
    lastActive: new Date()
  });
};

export const removeSession = (userId: string) => {
  activeSessions.delete(userId);
};

export const updateSessionActivity = (userId: string) => {
  const session = activeSessions.get(userId);
  if (session) {
    session.lastActive = new Date();
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