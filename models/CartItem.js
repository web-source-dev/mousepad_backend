const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  // User identification - reference to User model
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Basic item information
  name: {
    type: String,
    required: true,
    default: "Custom Mousepad"
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    enum: ['USD', 'SGD'],
    default: 'USD'
  },

  // Image URLs (hosted on Cloudinary)
  finalImage: {
    type: String,
    required: true
  },
  originalImageUrl: {
    type: String,
    required: true
  },

  // Essential specifications only
  mousepadType: {
    type: String,
    enum: ['normal', 'rgb'],
    default: 'normal'
  },
  mousepadSize: {
    type: String,
    default: '400x900'
  },
  thickness: {
    type: String,
    default: '3mm'
  },

  status: {
    type: String,
    enum: ['pending', 'paymentFailed', 'paymentSuccess', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Index for efficient queries
cartItemSchema.index({ user: 1, createdAt: -1 });

// Method to get cart items for a user
cartItemSchema.statics.getUserCart = function(userId) {
  return this.find({ user: userId }).sort({ createdAt: -1 });
};

// Method to add item to cart
cartItemSchema.statics.addToCart = function(cartItemData) {
  return this.create(cartItemData);
};

// Method to update cart item
cartItemSchema.statics.updateCartItem = function(_id, userId, updates) {
  return this.findOneAndUpdate(
    { _id, user: userId },
    updates,
    { new: true, runValidators: true }
  );
};

// Method to remove cart item
cartItemSchema.statics.removeFromCart = function(_id, userId) {
  return this.findOneAndDelete({ _id, user: userId });
};

// Method to clear user's cart
cartItemSchema.statics.clearUserCart = function(userId) {
  return this.deleteMany({ user: userId });
};

module.exports = mongoose.model('CartItem', cartItemSchema); 