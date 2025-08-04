const express = require('express');
const router = express.Router();
const CartItem = require('../models/CartItem');
const { validateCartItem, validateUserEmail } = require('../middleware/validate');
const { body, validationResult } = require('express-validator');

// @desc    Get user's cart items
// @route   GET /api/cart/:userEmail
// @access  Public
router.get('/:userEmail', validateUserEmail, async (req, res) => {
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
router.post('/', validateCartItem, async (req, res) => {
  try {
    const cartItemData = req.body;
    
    // Check if item with same ID already exists for this user
    const existingItem = await CartItem.findOne({
      id: cartItemData.id,
      userEmail: cartItemData.userEmail
    });

    if (existingItem) {
      // Update existing item
      const updatedItem = await CartItem.updateCartItem(
        cartItemData.id,
        cartItemData.userEmail,
        cartItemData
      );

      return res.status(200).json({
        success: true,
        message: 'Cart item updated successfully',
        data: updatedItem
      });
    }

    // Create new item
    const newCartItem = await CartItem.addToCart(cartItemData);

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

    const updatedItem = await CartItem.updateCartItem(id, userEmail, updates);

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
router.delete('/clear/:userEmail', validateUserEmail, async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    const result = await CartItem.clearUserCart(userEmail);

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
router.get('/summary/:userEmail', validateUserEmail, async (req, res) => {
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

// PATCH /api/cart/:cartId/payment - Update payment status
router.patch('/payment', [
  body('email').isEmail().withMessage('Valid email is required'),
    body('status').isIn(['pending', 'paymentFailed', 'paymentSuccess','cancelled']).withMessage('Valid payment status is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, status } = req.body;

    // Find cart and verify email matches
    const cart = await CartItem.findOne({ 
      userEmail: email 
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found or email does not match'
      });
    }

    // Update payment status
    cart.status = status;
    cart.updatedAt = new Date();
    await cart.save();

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        cartId: cart.id,
        status: cart.status,
        updatedAt: cart.updatedAt
      }
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

module.exports = router; 