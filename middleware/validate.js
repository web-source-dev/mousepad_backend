const validateCartItem = (req, res, next) => {
  const { userEmail, id, name, quantity, price, currency, image, finalImage, specs, configuration } = req.body;

  // Required fields validation
  if (!userEmail) {
    return res.status(400).json({
      success: false,
      error: 'User email is required'
    });
  }

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Item ID is required'
    });
  }

  if (!image || !finalImage) {
    return res.status(400).json({
      success: false,
      error: 'Image data is required'
    });
  }

  if (!specs || !specs.type || !specs.size || !specs.thickness) {
    return res.status(400).json({
      success: false,
      error: 'Mousepad specifications are required'
    });
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  // Price validation
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({
      success: false,
      error: 'Price must be a positive number'
    });
  }

  // Quantity validation
  if (typeof quantity !== 'number' || quantity < 1) {
    return res.status(400).json({
      success: false,
      error: 'Quantity must be at least 1'
    });
  }

  // Currency validation
  if (currency && !['USD', 'SGD'].includes(currency)) {
    return res.status(400).json({
      success: false,
      error: 'Currency must be USD or SGD'
    });
  }

  // Image size validation (basic check for base64)
  if (image.length > 10 * 1024 * 1024) { // 10MB limit
    return res.status(400).json({
      success: false,
      error: 'Image size too large (max 10MB)'
    });
  }

  next();
};

const validateUserEmail = (req, res, next) => {
  const { userEmail } = req.params;

  if (!userEmail) {
    return res.status(400).json({
      success: false,
      error: 'User email is required'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  next();
};

module.exports = {
  validateCartItem,
  validateUserEmail
}; 