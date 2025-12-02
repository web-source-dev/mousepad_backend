const express = require('express');
const router = express.Router();
const CartItem = require('../models/CartItem');
const { body, validationResult } = require('express-validator');
const { deleteImage } = require('../utils/imageProcessor');
const { isAuthenticated, authorize } = require('../middleware/auth');

// Validate image URL (must be hosted, not base64)
const validateImageUrl = (value, field, allowMissing) => {
  if (!value) {
    if (allowMissing) return value;
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

// Extract only essential fields for database storage
const sanitizeCartPayload = (payload, userId, { partial = false } = {}) => {
  const essentialFields = {
    user: userId,
    name: payload.name || 'Custom Mousepad',
    quantity: payload.quantity || 1,
    price: payload.price,
    currency: payload.currency || 'USD',
    mousepadType: payload.mousepadType || payload.specs?.type || payload.configuration?.mousepadType || 'normal',
    mousepadSize: payload.mousepadSize || payload.specs?.size || payload.configuration?.mousepadSize || '',
    thickness: payload.thickness || payload.specs?.thickness || payload.configuration?.thickness || '',
    status: payload.status || 'pending'
  };

  // Validate and sanitize image URLs
  const finalImage = payload.finalImage || payload.image;
  if (finalImage) {
    essentialFields.finalImage = validateImageUrl(finalImage, 'finalImage', partial);
  }
  if (payload.originalImageUrl) {
    essentialFields.originalImageUrl = validateImageUrl(payload.originalImageUrl, 'originalImageUrl', partial);
  }

  // Validate required fields for new items
  if (!partial) {
    if (!essentialFields.finalImage) throw new Error('finalImage is required');
    if (!essentialFields.originalImageUrl) throw new Error('originalImageUrl is required');
    if (!essentialFields.mousepadSize) throw new Error('mousepadSize is required');
    if (!essentialFields.thickness) throw new Error('thickness is required');
  }

  return essentialFields;
};

// @desc    Get user's cart items
// @route   GET /api/cart
// @access  Private
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const cartItems = await CartItem.getUserCart(req.user.id);
    
    res.status(200).json({
      success: true,
      count: cartItems.length,
      data: cartItems
    });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while fetching cart items' 
        : error.message
    });
  }
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
router.post('/', isAuthenticated, async (req, res) => {
  try {
    let processedData;
    try {
      processedData = sanitizeCartPayload(req.body, req.user.id);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }
    
    // Create new item (MongoDB will generate _id automatically)
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
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while adding item to cart' 
        : error.message
    });
  }
});

// @desc    Update cart item
// @route   PUT /api/cart/:_id
// @access  Private
router.put('/:_id', isAuthenticated, async (req, res) => {
  try {
    const { _id } = req.params;
    const updates = req.body;

    let processedUpdates;
    try {
      processedUpdates = sanitizeCartPayload(updates, req.user.id, { partial: true });
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }

    // Remove user field from updates (shouldn't be changed)
    delete processedUpdates.user;

    const updatedItem = await CartItem.updateCartItem(_id, req.user.id, processedUpdates);

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
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while updating cart item' 
        : error.message
    });
  }
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:_id
// @access  Private
router.delete('/:_id', isAuthenticated, async (req, res) => {
  try {
    const { _id } = req.params;

    const deletedItem = await CartItem.removeFromCart(_id, req.user.id);

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
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while removing item from cart' 
        : error.message
    });
  }
});

// @desc    Clear user's cart
// @route   DELETE /api/cart/clear
// @access  Private
router.delete('/clear', isAuthenticated, async (req, res) => {
  try {
    // Get cart items before clearing to clean up images
    const cartItems = await CartItem.getUserCart(req.user.id);
    
    const result = await CartItem.clearUserCart(req.user.id);

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
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while clearing cart' 
        : error.message
    });
  }
});

// @desc    Get cart summary (count and total price)
// @route   GET /api/cart/summary
// @access  Private
router.get('/summary', isAuthenticated, async (req, res) => {
  try {
    const cartItems = await CartItem.getUserCart(req.user.id);
    
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
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while fetching cart summary' 
        : error.message
    });
  }
});

router.patch('/payment', isAuthenticated, [
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

    const { status, itemIds } = req.body;

    // Find matching cart items by user and _id
    const updated = await CartItem.updateMany(
      { user: req.user.id, _id: { $in: itemIds } },
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
// @access  Private (Admin only)
router.get('/admin/all', isAuthenticated, authorize('admin'), async (req, res) => {
  try {
    const cartItems = await CartItem.find({}).populate('user', 'email firstName lastName').sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: cartItems.length,
      data: cartItems
    });
  } catch (error) {
    console.error('Error fetching all cart items:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while fetching all cart items' 
        : error.message
    });
  }
});

module.exports = router; 