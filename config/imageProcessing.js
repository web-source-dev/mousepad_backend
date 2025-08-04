/**
 * Image Processing Configuration
 * This file contains settings for image conversion and compression
 */

module.exports = {
  // Default image processing settings
  default: {
    targetFormat: 'jpeg', // 'jpeg' or 'webp'
    quality: 80, // 1-100
    maxWidth: 1920,
    maxHeight: 1080,
    forceConversion: false
  },

  // Settings for different image types
  imageTypes: {
    // Main product image
    main: {
      targetFormat: 'jpeg',
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080
    },

    // Final processed image (higher quality for final product)
    final: {
      targetFormat: 'jpeg',
      quality: 85,
      maxWidth: 1920,
      maxHeight: 1080
    },

    // Configuration images (original uploads)
    configuration: {
      targetFormat: 'jpeg',
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080
    },

    // Thumbnail images (smaller size for previews)
    thumbnail: {
      targetFormat: 'jpeg',
      quality: 70,
      maxWidth: 400,
      maxHeight: 300
    },

    // WebP format (better compression)
    webp: {
      targetFormat: 'webp',
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080
    }
  },

  // Enable/disable image processing
  enabled: true,

  // Fallback settings if processing fails
  fallback: {
    useOriginal: true, // Use original image if processing fails
    logErrors: true,   // Log processing errors
    continueOnError: true // Continue with other operations if one fails
  },

  // Performance settings
  performance: {
    maxConcurrentProcessing: 3, // Maximum concurrent image processing operations
    timeout: 30000, // 30 seconds timeout for image processing
    memoryLimit: '512MB' // Memory limit for image processing
  }
}; 