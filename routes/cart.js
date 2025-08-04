const express = require('express');
const router = express.Router();
const CartItem = require('../models/CartItem');
const { validateCartItem, validateUserEmail } = require('../middleware/validate');
const { body, validationResult } = require('express-validator');
const { processImage } = require('../utils/imageConverter');
const imageConfig = require('../config/imageProcessing');

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
    
    // Process images before saving to database
    const processedData = { ...cartItemData };
    
    // Process main image if it exists
    if (processedData.image && imageConfig.enabled) {
      try {
        processedData.image = await processImage(processedData.image, imageConfig.imageTypes.main);
        console.log('Main image processed successfully');
      } catch (imageError) {
        console.error('Error processing main image:', imageError);
        if (!imageConfig.fallback.useOriginal) {
          throw imageError;
        }
      }
    }
    
    // Process final image if it exists
    if (processedData.finalImage && imageConfig.enabled) {
      try {
        processedData.finalImage = await processImage(processedData.finalImage, imageConfig.imageTypes.final);
        console.log('Final image processed successfully');
      } catch (imageError) {
        console.error('Error processing final image:', imageError);
        if (!imageConfig.fallback.useOriginal) {
          throw imageError;
        }
      }
    }
    
    // Process configuration images if they exist
    if (processedData.configuration?.imageSettings?.uploadedImage && imageConfig.enabled) {
      try {
        processedData.configuration.imageSettings.uploadedImage = await processImage(
          processedData.configuration.imageSettings.uploadedImage,
          imageConfig.imageTypes.configuration
        );
        console.log('Configuration uploaded image processed successfully');
      } catch (imageError) {
        console.error('Error processing configuration uploaded image:', imageError);
        if (!imageConfig.fallback.continueOnError) {
          throw imageError;
        }
      }
    }
    
    if (processedData.configuration?.imageSettings?.editedImage && imageConfig.enabled) {
      try {
        processedData.configuration.imageSettings.editedImage = await processImage(
          processedData.configuration.imageSettings.editedImage,
          imageConfig.imageTypes.final
        );
        console.log('Configuration edited image processed successfully');
      } catch (imageError) {
        console.error('Error processing configuration edited image:', imageError);
        if (!imageConfig.fallback.continueOnError) {
          throw imageError;
        }
      }
    }
    
    if (processedData.configuration?.imageSettings?.originalImage && imageConfig.enabled) {
      try {
        processedData.configuration.imageSettings.originalImage = await processImage(
          processedData.configuration.imageSettings.originalImage,
          imageConfig.imageTypes.configuration
        );
        console.log('Configuration original image processed successfully');
      } catch (imageError) {
        console.error('Error processing configuration original image:', imageError);
        if (!imageConfig.fallback.continueOnError) {
          throw imageError;
        }
      }
    }
    
    // Process uploaded images array if it exists
    if (processedData.configuration?.uploadedImages && Array.isArray(processedData.configuration.uploadedImages) && imageConfig.enabled) {
      for (let i = 0; i < processedData.configuration.uploadedImages.length; i++) {
        try {
          processedData.configuration.uploadedImages[i] = await processImage(
            processedData.configuration.uploadedImages[i],
            imageConfig.imageTypes.configuration
          );
        } catch (imageError) {
          console.error(`Error processing uploaded image ${i}:`, imageError);
          if (!imageConfig.fallback.continueOnError) {
            throw imageError;
          }
        }
      }
      console.log('Uploaded images array processed successfully');
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

    // Process images in updates before saving
    const processedUpdates = { ...updates };
    
    // Process main image if it exists in updates
    if (processedUpdates.image && imageConfig.enabled) {
      try {
        processedUpdates.image = await processImage(processedUpdates.image, imageConfig.imageTypes.main);
        console.log('Updated main image processed successfully');
      } catch (imageError) {
        console.error('Error processing updated main image:', imageError);
        if (!imageConfig.fallback.useOriginal) {
          throw imageError;
        }
      }
    }
    
    // Process final image if it exists in updates
    if (processedUpdates.finalImage && imageConfig.enabled) {
      try {
        processedUpdates.finalImage = await processImage(processedUpdates.finalImage, imageConfig.imageTypes.final);
        console.log('Updated final image processed successfully');
      } catch (imageError) {
        console.error('Error processing updated final image:', imageError);
        if (!imageConfig.fallback.useOriginal) {
          throw imageError;
        }
      }
    }
    
    // Process configuration images if they exist in updates
    if (processedUpdates.configuration?.imageSettings?.uploadedImage && imageConfig.enabled) {
      try {
        processedUpdates.configuration.imageSettings.uploadedImage = await processImage(
          processedUpdates.configuration.imageSettings.uploadedImage,
          imageConfig.imageTypes.configuration
        );
        console.log('Updated configuration uploaded image processed successfully');
      } catch (imageError) {
        console.error('Error processing updated configuration uploaded image:', imageError);
        if (!imageConfig.fallback.continueOnError) {
          throw imageError;
        }
      }
    }
    
    if (processedUpdates.configuration?.imageSettings?.editedImage && imageConfig.enabled) {
      try {
        processedUpdates.configuration.imageSettings.editedImage = await processImage(
          processedUpdates.configuration.imageSettings.editedImage,
          imageConfig.imageTypes.final
        );
        console.log('Updated configuration edited image processed successfully');
      } catch (imageError) {
        console.error('Error processing updated configuration edited image:', imageError);
        if (!imageConfig.fallback.continueOnError) {
          throw imageError;
        }
      }
    }
    
    if (processedUpdates.configuration?.imageSettings?.originalImage && imageConfig.enabled) {
      try {
        processedUpdates.configuration.imageSettings.originalImage = await processImage(
          processedUpdates.configuration.imageSettings.originalImage,
          imageConfig.imageTypes.configuration
        );
        console.log('Updated configuration original image processed successfully');
      } catch (imageError) {
        console.error('Error processing updated configuration original image:', imageError);
        if (!imageConfig.fallback.continueOnError) {
          throw imageError;
        }
      }
    }
    
    // Process uploaded images array if it exists in updates
    if (processedUpdates.configuration?.uploadedImages && Array.isArray(processedUpdates.configuration.uploadedImages) && imageConfig.enabled) {
      for (let i = 0; i < processedUpdates.configuration.uploadedImages.length; i++) {
        try {
          processedUpdates.configuration.uploadedImages[i] = await processImage(
            processedUpdates.configuration.uploadedImages[i],
            imageConfig.imageTypes.configuration
          );
        } catch (imageError) {
          console.error(`Error processing updated uploaded image ${i}:`, imageError);
          if (!imageConfig.fallback.continueOnError) {
            throw imageError;
          }
        }
      }
      console.log('Updated uploaded images array processed successfully');
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