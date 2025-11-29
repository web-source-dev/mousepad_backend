const cloudinary = require('cloudinary').v2;

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Configure Cloudinary (lazy initialization for serverless)
let cloudinaryConfigured = false;

const configureCloudinary = () => {
  if (!cloudinaryConfigured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    cloudinaryConfigured = true;
  }
};

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

    configureCloudinary();

    // Extract public ID from URL
    // Handle both formats: https://res.cloudinary.com/cloud/image/upload/v123/folder/file.jpg
    const urlParts = imageUrl.split('/');
    const uploadIndex = urlParts.findIndex(part => part === 'upload');
    
    if (uploadIndex === -1) {
      return false;
    }

    // Get everything after 'upload' and before file extension
    const pathAfterUpload = urlParts.slice(uploadIndex + 1);
    const lastPart = pathAfterUpload[pathAfterUpload.length - 1];
    const publicId = lastPart.split('.')[0];
    
    // Reconstruct folder path if exists
    const folderParts = pathAfterUpload.slice(0, -1);
    const fullPublicId = folderParts.length > 0 
      ? `${folderParts.join('/')}/${publicId}`
      : publicId;

    const result = await cloudinary.uploader.destroy(fullPublicId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Image deleted from Cloudinary: ${fullPublicId}`);
    }
    
    return result.result === 'ok';
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    return false;
  }
}

module.exports = {
  deleteImage
}; 