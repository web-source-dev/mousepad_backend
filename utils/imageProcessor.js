const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Image configuration
const imageConfig = {
  enabled: true,
  imageTypes: {
    main: {
      folder: 'mousepad/main',
      transformation: {
        quality: 'auto',
        fetch_format: 'auto',
        width: 800,
        height: 600,
        crop: 'fill'
      }
    },
    final: {
      folder: 'mousepad/final',
      transformation: {
        quality: 'auto',
        fetch_format: 'auto',
        width: 1200,
        height: 800,
        crop: 'fill'
      }
    },
    configuration: {
      folder: 'mousepad/config',
      transformation: {
        quality: 'auto',
        fetch_format: 'auto',
        width: 600,
        height: 400,
        crop: 'fill'
      }
    }
  },
  fallback: {
    useOriginal: true,
    continueOnError: true
  }
};

/**
 * Process base64 image and upload to Cloudinary
 * @param {string} base64Image - Base64 encoded image string
 * @param {Object} imageType - Image type configuration
 * @returns {Promise<string>} - Cloudinary URL
 */
async function processImage(base64Image, imageType) {
  try {
    // Check if the image is already a URL (not base64)
    if (base64Image.startsWith('http')) {
      return base64Image;
    }

    // Remove data URL prefix if present
    let imageData = base64Image;
    if (base64Image.startsWith('data:image/')) {
      imageData = base64Image.split(',')[1];
    }

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${imageData}`,
      {
        folder: imageType.folder,
        transformation: imageType.transformation,
        resource_type: 'image',
        format: 'jpg'
      }
    );

    console.log(`Image uploaded to Cloudinary: ${uploadResult.secure_url}`);
    return uploadResult.secure_url;
  } catch (error) {
    console.error('Error processing image:', error);
    
    if (imageConfig.fallback.useOriginal) {
      console.log('Using original image due to processing error');
      return base64Image;
    }
    
    throw error;
  }
}

/**
 * Delete image from Cloudinary
 * @param {string} imageUrl - Cloudinary URL
 * @returns {Promise<boolean>} - Success status
 */
async function deleteImage(imageUrl) {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return true; // Not a Cloudinary URL, nothing to delete
    }

    // Extract public ID from URL
    const urlParts = imageUrl.split('/');
    const publicId = urlParts[urlParts.length - 1].split('.')[0];
    const folder = urlParts[urlParts.length - 2];
    const fullPublicId = `${folder}/${publicId}`;

    const result = await cloudinary.uploader.destroy(fullPublicId);
    console.log(`Image deleted from Cloudinary: ${fullPublicId}`);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
}

module.exports = {
  processImage,
  deleteImage,
  imageConfig
}; 