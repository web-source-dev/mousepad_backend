const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Drop old orderId index if it exists (migration from orderId to _id)
    try {
      const db = mongoose.connection.db;
      const ordersCollection = db.collection('orders');
      const indexes = await ordersCollection.indexes();
      const orderIdIndex = indexes.find(idx => idx.name === 'orderId_1');
      if (orderIdIndex) {
        await ordersCollection.dropIndex('orderId_1');
        console.log('Dropped old orderId_1 index from orders collection');
      }
    } catch (indexError) {
      // Index might not exist, which is fine
      if (indexError.code !== 27) { // 27 = IndexNotFound
        console.warn('Error dropping orderId index:', indexError.message);
      }
    }
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB; 