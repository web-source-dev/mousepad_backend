const express = require('express');
const router = express.Router();
const CartItem = require('../models/CartItem');
const { body, validationResult } = require('express-validator');
const { deleteImage } = require('../utils/imageProcessor');

const clonePayload = (payload) => JSON.parse(JSON.stringify(payload));

const ensureHostedImage = (value, field, allowMissing) => {
  if (!value) {
    if (allowMissing) {
      return value;
    }
    throw new Error(`${field} is required`);
  }

  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string URL`);
  }

  if (value.startsWith('data:')) {
    throw new Error(`${field} must be uploaded before saving`);
  }

  return value;
};

const sanitizeCartPayload = (payload, { partial = false } = {}) => {
  const sanitized = clonePayload(payload);

  sanitized.image = sanitized.image
    ? ensureHostedImage(sanitized.image, 'image', partial)
    : sanitized.image;
  sanitized.finalImage = sanitized.finalImage
    ? ensureHostedImage(sanitized.finalImage, 'finalImage', partial)
    : sanitized.finalImage;
  sanitized.originalImageUrl = sanitized.originalImageUrl
    ? ensureHostedImage(sanitized.originalImageUrl, 'originalImageUrl', partial)
    : sanitized.originalImageUrl;

  if (!partial) {
    sanitized.image = ensureHostedImage(sanitized.image, 'image');
    sanitized.finalImage = ensureHostedImage(sanitized.finalImage, 'finalImage');
    sanitized.originalImageUrl = ensureHostedImage(sanitized.originalImageUrl, 'originalImageUrl');
  }

  if (sanitized.configuration?.imageSettings) {
    const { zoom, position, adjustments, filter, crop } = sanitized.configuration.imageSettings;
    sanitized.configuration.imageSettings = { zoom, position, adjustments, filter, crop };
  }

  if (sanitized.configuration) {
    delete sanitized.configuration.uploadedImages;
    delete sanitized.configuration.logoFile;
  }

  return sanitized;
};

// @desc    Get user's cart items
// @route   GET /api/cart/:userEmail
// @access  Public
router.get('/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    const cartItems = await CartItem.getUserCart(userEmail);
    
    res.status(200).json({
      success: true,
      count: cartItems.length,
      data: cartItems
    });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching cart items'
    });
  }
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Public
router.post('/', async (req, res) => {
  try {
    let processedData;
    try {
      processedData = sanitizeCartPayload(req.body);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }
    
    // Check if item with same ID already exists for this user
    const existingItem = await CartItem.findOne({
      id: processedData.id,
      userEmail: processedData.userEmail
    });

    if (existingItem) {
      // Update existing item
      const updatedItem = await CartItem.updateCartItem(
        processedData.id,
        processedData.userEmail,
        processedData
      );

      return res.status(200).json({
        success: true,
        message: 'Cart item updated successfully',
        data: updatedItem
      });
    }

    // Create new item
    const newCartItem = await CartItem.addToCart(processedData);

    res.status(201).json({
      success: true,
      message: 'Item added to cart successfully',
      data: newCartItem
    });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while adding item to cart'
    });
  }
});

// @desc    Update cart item
// @route   PUT /api/cart/:id
// @access  Public
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail, ...updates } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    let processedUpdates;
    try {
      processedUpdates = sanitizeCartPayload(updates, { partial: true });
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }

    const updatedItem = await CartItem.updateCartItem(id, userEmail, processedUpdates);

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: updatedItem
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while updating cart item'
    });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:id
// @access  Public
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    const deletedItem = await CartItem.removeFromCart(id, userEmail);

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
    }

    // Clean up stored images (final + original)
    try {
      if (deletedItem.finalImage) {
        await deleteImage(deletedItem.finalImage);
      }
      if (deletedItem.originalImageUrl) {
        await deleteImage(deletedItem.originalImageUrl);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up images:', cleanupError);
      // Don't fail the request if cleanup fails
    }

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: deletedItem
    });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while removing item from cart'
    });
  }
});

// @desc    Clear user's cart
// @route   DELETE /api/cart/clear/:userEmail
// @access  Public
router.delete('/clear/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    // Get cart items before clearing to clean up images
    const cartItems = await CartItem.getUserCart(userEmail);
    
    const result = await CartItem.clearUserCart(userEmail);

    // Clean up images from Cloudinary
    try {
      for (const item of cartItems) {
        if (item.finalImage) {
          await deleteImage(item.finalImage);
        }
        if (item.originalImageUrl) {
          await deleteImage(item.originalImageUrl);
        }
      }
    } catch (cleanupError) {
      console.error('Error cleaning up images:', cleanupError);
      // Don't fail the request if cleanup fails
    }

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while clearing cart'
    });
  }
});

// @desc    Get cart summary (count and total price)
// @route   GET /api/cart/summary/:userEmail
// @access  Public
router.get('/summary/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    const cartItems = await CartItem.getUserCart(userEmail);
    
    const summary = cartItems.reduce((acc, item) => {
      acc.itemCount += item.quantity;
      acc.totalPrice += item.price * item.quantity;
      return acc;
    }, { itemCount: 0, totalPrice: 0 });

    res.status(200).json({
      success: true,
      data: {
        itemCount: summary.itemCount,
        totalPrice: summary.totalPrice,
        currency: cartItems.length > 0 ? cartItems[0].currency : 'USD'
      }
    });
  } catch (error) {
    console.error('Error fetching cart summary:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching cart summary'
    });
  }
});

router.patch('/payment', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('status').isIn(['pending', 'paymentFailed', 'paymentSuccess', 'cancelled']).withMessage('Valid payment status is required'),
  body('itemIds').isArray({ min: 1 }).withMessage('itemIds must be a non-empty array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, status, itemIds } = req.body;

    // Find matching cart items by email and ID
    const updated = await CartItem.updateMany(
      { userEmail: email, id: { $in: itemIds } },
      { $set: { status: status, updatedAt: new Date() } }
    );

    if (updated.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No cart items found or updated'
      });
    }

    return res.json({
      success: true,
      message: `Payment status updated for ${updated.modifiedCount} items.`,
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// @desc    Get all cart items (admin endpoint)
// @route   GET /api/cart/admin/all
// @access  Public (you might want to add authentication later)
router.get('/admin/all', async (req, res) => {
  try {
    const cartItems = await CartItem.find({}).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: cartItems.length,
      data: cartItems
    });
  } catch (error) {
    console.error('Error fetching all cart items:', error);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching all cart items'
    });
  }
});

module.exports = router; 