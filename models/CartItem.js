const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  // User identification
  userEmail: {
    type: String,
    required: true,
    index: true
  },

  // Basic item information
  id: {
    type: String,
    required: true,
    unique: true
  },
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

  // Image data (base64 encoded)
  image: {
    type: String,
    required: true
  },
  finalImage: {
    type: String,
    required: true
  },
  originalImageUrl: {
    type: String,
    required: true
  },

  // Mousepad specifications
  specs: {
    type: {
      type: String,
      enum: ['normal', 'rgb'],
      required: true
    },
    size: {
      type: String,
      required: true
    },
    thickness: {
      type: String,
      required: true
    },
    rgb: {
      mode: {
        type: String,
        enum: ['static', 'rainbow']
      },
      color: String,
      brightness: {
        type: Number,
        min: 0,
        max: 100
      },
      animationSpeed: {
        type: Number,
        min: 0,
        max: 100
      }
    },
    text: [{
      id: Number,
      type: String,
      text: String,
      font: String,
      size: Number,
      x: Number,
      y: Number,
      color: String,
      position: {
        x: Number,
        y: Number
      },
      rotation: Number,
      opacity: Number,
      shadow: {
        enabled: Boolean,
        x: Number,
        y: Number,
        blur: Number,
        color: String
      },
      outline: {
        enabled: Boolean,
        width: Number,
        color: String
      },
      gradient: {
        enabled: Boolean,
        from: String,
        to: String,
        direction: String
      }
    }],
    overlays: [String],
    adjustments: {
      brightness: Number,
      contrast: Number,
      saturation: Number,
      blur: Number,
      sharpen: Number,
      gamma: Number
    },
    filter: String,
    zoom: Number,
    imagePosition: {
      x: Number,
      y: Number
    }
  },

  // Full configuration data for reconstruction
  configuration: {
    mousepadType: String,
    mousepadSize: String,
    thickness: String,
    rgb: {
      mode: String,
      color: String,
      brightness: Number,
      animationSpeed: Number
    },
    imageSettings: {
      uploadedImage: String,
      editedImage: String,
      originalImage: String,
      zoom: Number,
      position: {
        x: Number,
        y: Number
      },
      adjustments: {
        brightness: Number,
        contrast: Number,
        saturation: Number,
        blur: Number,
        sharpen: Number,
        gamma: Number
      },
      filter: String,
      crop: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    },
    textElements: [Object],
    imageTextOverlays: [Object],
    selectedTemplate: Object,
    appliedOverlays: [String],
    logoFile: String,
    uploadedImages: [String]
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
cartItemSchema.index({ userEmail: 1, createdAt: -1 });

// Pre-save middleware to update the updatedAt field
cartItemSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to get cart items for a user
cartItemSchema.statics.getUserCart = function(userEmail) {
  return this.find({ userEmail }).sort({ createdAt: -1 });
};

// Method to add item to cart
cartItemSchema.statics.addToCart = function(cartItemData) {
  return this.create(cartItemData);
};

// Method to update cart item
cartItemSchema.statics.updateCartItem = function(id, userEmail, updates) {
  return this.findOneAndUpdate(
    { id, userEmail },
    { ...updates, updatedAt: new Date() },
    { new: true }
  );
};

// Method to remove cart item
cartItemSchema.statics.removeFromCart = function(id, userEmail) {
  return this.findOneAndDelete({ id, userEmail });
};

// Method to clear user's cart
cartItemSchema.statics.clearUserCart = function(userEmail) {
  return this.deleteMany({ userEmail });
};

module.exports = mongoose.model('CartItem', cartItemSchema); 