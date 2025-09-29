import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const app = express();

// Vercel provides PORT, use 5001 as fallback for local development
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// MongoDB connection
const connectDB = async (): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not defined');
      // Don't exit in serverless - just log error
      return;
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
  }
};

// Connect to database (will be called on each cold start)
connectDB();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development',
    platform: 'vercel'
  });
});

// Import and use your routes
import bookRoutes from './routes/bookRoutes';
app.use('/api/books', bookRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Book Store API - Deployed on Vercel',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      books: '/api/books'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Export for Vercel serverless
export default app;

// Only listen locally, not in Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}