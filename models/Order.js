const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // User identification - simple string ID from localStorage
  userId: {
    type: String,
    required: true,
    index: true
  },

  // Order items - store cart item references and snapshot data
  items: [{
    cartItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CartItem',
      required: true
    },
    name: String,
    quantity: Number,
    price: Number,
    currency: String,
    finalImage: String,
    originalImageUrl: String,
    mousepadType: String,
    mousepadSize: String,
    thickness: String
  }],

  // Pricing information
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shipping: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'SGD'],
    default: 'USD'
  },

  // Customer information
  customerInfo: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    additionalNotes: String
  },

  // Order status
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'paymentFailed'],
    default: 'pending'
  },

  // Payment information (to be implemented later)
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: String,
  paymentTransactionId: String,

  // Additional metadata
  notes: String
}, {
  timestamps: true
});

// Index for efficient queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

// Method to create order
orderSchema.statics.createOrder = function(orderData) {
  return this.create(orderData);
};

// Method to get user's orders
orderSchema.statics.getUserOrders = function(userId) {
  return this.find({ userId: userId }).sort({ createdAt: -1 });
};

// Method to get order by _id
orderSchema.statics.getOrderById = function(orderId) {
  return this.findOne({ _id: orderId });
};

module.exports = mongoose.model('Order', orderSchema);

