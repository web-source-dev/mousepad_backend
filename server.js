const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Import database connection
const connectDB = require('./config/database');

// Import routes
const cartRoutes = require('./routes/cart');

// Initialize express app
const app = express();

// Connect to MongoDB (async, but don't block serverless startup)
if (process.env.MONGODB_URI) {
  connectDB().catch(err => {
    console.error('Failed to connect to MongoDB:', err);
  });
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - parse multiple origins
const getCorsOrigins = () => {
  const origins = process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'https://evogear.rtnglobal.co',
    'https://www.evogearstudio.com'
  ];
  return origins.map(origin => origin.trim());
};

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getCorsOrigins();
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use(compression());
}

// Body parser middleware
app.use(express.json({ limit: '10mb' })); // Reduced from 50mb
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoose = require('mongoose');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'error'
    });
  }
});

// API routes
app.use('/api/cart', cartRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// Start server only if not in serverless environment
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

module.exports = app; 