const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const CartItem = require('../models/CartItem');
const { isAuthenticated } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @desc    Create new order from checkout
// @route   POST /api/order
// @access  Private
router.post('/', isAuthenticated, [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.cartItemId').notEmpty().withMessage('Cart item ID is required'),
  body('subtotal').isNumeric().withMessage('Subtotal must be a number'),
  body('total').isNumeric().withMessage('Total must be a number'),
  body('customerInfo.firstName').notEmpty().withMessage('First name is required'),
  body('customerInfo.lastName').notEmpty().withMessage('Last name is required'),
  body('customerInfo.email').isEmail().withMessage('Valid email is required'),
  body('customerInfo.phone').notEmpty().withMessage('Phone number is required'),
  body('customerInfo.address.street').notEmpty().withMessage('Street address is required'),
  body('customerInfo.address.city').notEmpty().withMessage('City is required'),
  body('customerInfo.address.state').notEmpty().withMessage('State is required'),
  body('customerInfo.address.zipCode').notEmpty().withMessage('ZIP code is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { items, subtotal, shipping, tax, total, currency, customerInfo } = req.body;
    const userId = req.user.id;

    // Verify all cart items belong to the user
    const cartItemIds = items.map(item => item.cartItemId);
    const cartItems = await CartItem.find({
      _id: { $in: cartItemIds },
      user: userId
    });

    if (cartItems.length !== cartItemIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some cart items do not belong to you or do not exist'
      });
    }

    // Create order data
    const orderData = {
      user: userId,
      items: items.map(item => {
        const cartItem = cartItems.find(ci => ci._id.toString() === item.cartItemId);
        return {
          cartItemId: item.cartItemId,
          name: cartItem.name,
          quantity: cartItem.quantity,
          price: cartItem.price,
          currency: cartItem.currency,
          finalImage: cartItem.finalImage,
          originalImageUrl: cartItem.originalImageUrl,
          mousepadType: cartItem.mousepadType,
          mousepadSize: cartItem.mousepadSize,
          thickness: cartItem.thickness
        };
      }),
      subtotal: subtotal || 0,
      shipping: shipping || 0,
      tax: tax || 0,
      total: total || 0,
      currency: currency || 'USD',
      customerInfo: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: {
          street: customerInfo.address.street,
          city: customerInfo.address.city,
          state: customerInfo.address.state,
          zipCode: customerInfo.address.zipCode,
          country: customerInfo.address.country || 'United States'
        },
        additionalNotes: customerInfo.additionalNotes || ''
      },
      status: 'pending',
      paymentStatus: 'pending'
    };

    // Create order
    const order = await Order.createOrder(orderData);

    // Populate user data for response
    await order.populate('user', 'email firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while creating order' 
        : error.message
    });
  }
});

// @desc    Get user's orders
// @route   GET /api/order
// @access  Private
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const orders = await Order.getUserOrders(req.user.id);
    
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while fetching orders' 
        : error.message
    });
  }
});

// @desc    Get order by _id
// @route   GET /api/order/:_id
// @access  Private
router.get('/:_id', isAuthenticated, async (req, res) => {
  try {
    const { _id } = req.params;
    const order = await Order.getOrderById(_id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Verify order belongs to user (unless admin)
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while fetching order' 
        : error.message
    });
  }
});

// @desc    Update order payment status
// @route   PATCH /api/order/:_id/payment-status
// @access  Private
router.patch('/:_id/payment-status', isAuthenticated, [
  body('status').isIn(['pending', 'processing', 'completed', 'failed', 'refunded']).withMessage('Invalid payment status'),
  body('paymentTransactionId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { _id } = req.params;
    const { status, paymentTransactionId } = req.body;
    const userId = req.user.id;

    // Find order by _id
    const order = await Order.getOrderById(_id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Verify order belongs to user (unless admin)
    if (order.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this order'
      });
    }

    // Update payment status
    const updateData = {
      paymentStatus: status
    };

    // Update order status based on payment status
    if (status === 'completed') {
      updateData.status = 'processing';
    } else if (status === 'failed') {
      updateData.status = 'paymentFailed';
    }

    // Add payment transaction ID if provided
    if (paymentTransactionId) {
      updateData.paymentTransactionId = paymentTransactionId;
    }

    // Update order
    const updatedOrder = await Order.findByIdAndUpdate(
      order._id,
      { $set: updateData },
      { new: true }
    ).populate('user', 'email firstName lastName');

    res.status(200).json({
      success: true,
      message: 'Order payment status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Error updating order payment status:', error);
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' 
        ? 'Server error while updating order payment status' 
        : error.message
    });
  }
});

module.exports = router;

