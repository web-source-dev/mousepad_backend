const mongoose = require('mongoose');

// Cache connection for serverless (reuse across invocations)
let cachedConnection = null;

const connectDB = async () => {
  // Return cached connection if available (serverless optimization)
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    // Cache the connection
    cachedConnection = conn;

    // Only log in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      cachedConnection = null; // Clear cache on error
    });

    mongoose.connection.on('disconnected', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('MongoDB disconnected');
      }
      cachedConnection = null; // Clear cache on disconnect
    });

    return conn;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    cachedConnection = null;
    // Don't exit process in serverless - let Vercel handle it
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    process.exit(1);
  }
};

module.exports = connectDB; 