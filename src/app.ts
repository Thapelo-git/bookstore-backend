import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models';
// Load environment variables
dotenv.config();

const app = express();

// Vercel provides PORT, use 5001 as fallback for local development
const PORT = process.env.PORT || 5002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5174',
   
  "http://localhost:5173"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// More strict rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 5 requests per windowMs for auth
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});
app.use('/api/auth/', authLimiter);

// MongoDB connection
const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined in environment variables');
      // In production, we might want to exit, but in serverless we continue
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MONGODB_URI is required');
      }
      return;
    }
    
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      // Remove deprecated options, use new URL string parser
    });
    
    console.log('✅ MongoDB Connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    // In serverless environment, we don't want to exit process
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Connect to database
connectDB();

// Import routes
import authRoutes from './routes/auth';
import bookRoutes from './routes/bookRoutes';


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    success: true,
    status: 'OK', 
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    platform: 'vercel',
    timestamp: new Date().toISOString()
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Book Store API - Deployed on Vercel',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/profile',
        changePassword: 'PUT /api/auth/change-password'
      },
      books: {
        getAll: 'GET /api/books',
        getOne: 'GET /api/books/:id',
        create: 'POST /api/books',
        update: 'PUT /api/books/:id',
        delete: 'DELETE /api/books/:id',
        search: 'GET /api/books/search',
        stats: 'GET /api/books/stats'
      },
      
      health: 'GET /api/health'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Book Store API Server',
    description: 'A secure MERN stack application with authentication',
    version: '1.0.0',
    documentation: '/api',
    health: '/api/health'
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

// Global 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Temporary debug route - add this before your other routes
app.post('/api/debug/password-check', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔍 DEBUG: Checking password for:', email);
    console.log('🔍 DEBUG: Input password:', password);
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.json({ error: 'User not found' });
    }

    console.log('🔍 DEBUG: Stored password hash:', user.password);
    console.log('🔍 DEBUG: Hash length:', user.password.length);
    console.log('🔍 DEBUG: Hash starts with:', user.password.substring(0, 10));

    // Test manual bcrypt comparison
    const manualMatch = await bcrypt.compare(password, user.password);
    console.log('🔍 DEBUG: Manual bcrypt.compare result:', manualMatch);

    // Test if the input password matches the stored hash
    const testHashes = await Promise.all([
      bcrypt.hash(password, 10),
      bcrypt.hash(password, 12),
      bcrypt.hash('Mol123456', 10), // Hardcoded test
    ]);

    res.json({
      userExists: true,
      inputPassword: password,
      storedHash: user.password,
      storedHashLength: user.password.length,
      manualBcryptMatch: manualMatch,
      testHashes: {
        salt10: testHashes[0],
        salt12: testHashes[1],
        hardcoded: testHashes[2]
      }
    });
  } catch (error: any) {
    console.error('🔍 DEBUG Error:', error);
    res.json({ error: error.message });
  }
});

// Add this route to see ALL users and their password hashes
app.get('/api/debug/users', async (req, res) => {
  try {
    const users = await User.find().select('+password');
    const userData = users.map(user => ({
      id: user._id,
      email: user.email,
      name: user.name,
      passwordHash: user.password,
      passwordLength: user.password.length,
      createdAt: user.createdAt
    }));
    
    res.json({ users: userData });
  } catch (error: any) {
    res.json({ error: error.message });
  }
});
// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Global Error Handler:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }))
    });
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate field value: ${field}`,
      field: field
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.log('🚨 Unhandled Rejection:', err.name, err.message);
  console.log('💥 Shutting down server...');
  
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.log('🚨 Uncaught Exception:', err.name, err.message);
  console.log('💥 Shutting down server...');
  
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Export for Vercel serverless
export default app;

// Only listen locally, not in Vercel
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
    console.log(`❤️ Health Check: http://localhost:${PORT}/api/health`);
  });
}