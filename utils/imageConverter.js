const sharp = require('sharp');

/**
 * Convert base64 image to compressed JPEG format
 * @param {string} base64Image - Base64 encoded image string
 * @param {Object} options - Conversion options
 * @param {number} options.quality - JPEG quality (1-100), default: 80
 * @param {number} options.maxWidth - Maximum width in pixels, default: 1920
 * @param {number} options.maxHeight - Maximum height in pixels, default: 1080
 * @returns {Promise<string>} - Compressed base64 JPEG string
 */
async function convertBase64ToCompressedJPEG(base64Image, options = {}) {
  try {
    const {
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080
    } = options;

    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Process image with sharp
    const processedImage = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: quality,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();
    
    // Convert back to base64
    const compressedBase64 = `data:image/jpeg;base64,${processedImage.toString('base64')}`;
    
    return compressedBase64;
  } catch (error) {
    console.error('Error converting image:', error);
    throw new Error('Failed to convert image format');
  }
}

/**
 * Convert base64 image to WebP format for better compression
 * @param {string} base64Image - Base64 encoded image string
 * @param {Object} options - Conversion options
 * @param {number} options.quality - WebP quality (1-100), default: 80
 * @param {number} options.maxWidth - Maximum width in pixels, default: 1920
 * @param {number} options.maxHeight - Maximum height in pixels, default: 1080
 * @returns {Promise<string>} - Compressed base64 WebP string
 */
async function convertBase64ToWebP(base64Image, options = {}) {
  try {
    const {
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080
    } = options;

    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Process image with sharp
    const processedImage = await sharp(imageBuffer)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ 
        quality: quality,
        effort: 6
      })
      .toBuffer();
    
    // Convert back to base64
    const compressedBase64 = `data:image/webp;base64,${processedImage.toString('base64')}`;
    
    return compressedBase64;
  } catch (error) {
    console.error('Error converting image to WebP:', error);
    throw new Error('Failed to convert image to WebP format');
  }
}

/**
 * Get image format from base64 string
 * @param {string} base64Image - Base64 encoded image string
 * @returns {string} - Image format (jpeg, png, webp, etc.)
 */
function getImageFormat(base64Image) {
  const match = base64Image.match(/^data:image\/([a-z]+);base64,/);
  return match ? match[1] : 'unknown';
}

/**
 * Check if image needs conversion (if it's not already JPEG or WebP)
 * @param {string} base64Image - Base64 encoded image string
 * @returns {boolean} - True if conversion is needed
 */
function needsConversion(base64Image) {
  const format = getImageFormat(base64Image);
  return !['jpeg', 'jpg', 'webp'].includes(format.toLowerCase());
}

/**
 * Process image based on format and size
 * @param {string} base64Image - Base64 encoded image string
 * @param {Object} options - Processing options
 * @returns {Promise<string>} - Processed base64 image string
 */
async function processImage(base64Image, options = {}) {
  try {
    const {
      targetFormat = 'jpeg', // 'jpeg' or 'webp'
      quality = 80,
      maxWidth = 1920,
      maxHeight = 1080,
      forceConversion = false
    } = options;

    // Check if conversion is needed
    const format = getImageFormat(base64Image);
    const needsConvert = forceConversion || needsConversion(base64Image);

    if (!needsConvert) {
      // If already in target format, just resize if needed
      if (format.toLowerCase() === targetFormat) {
        return await convertBase64ToCompressedJPEG(base64Image, {
          quality,
          maxWidth,
          maxHeight
        });
      }
    }

    // Convert to target format
    if (targetFormat === 'webp') {
      return await convertBase64ToWebP(base64Image, {
        quality,
        maxWidth,
        maxHeight
      });
    } else {
      return await convertBase64ToCompressedJPEG(base64Image, {
        quality,
        maxWidth,
        maxHeight
      });
    }
  } catch (error) {
    console.error('Error processing image:', error);
    // Return original image if conversion fails
    return base64Image;
  }
}

module.exports = {
  convertBase64ToCompressedJPEG,
  convertBase64ToWebP,
  getImageFormat,
  needsConversion,
  processImage
}; 