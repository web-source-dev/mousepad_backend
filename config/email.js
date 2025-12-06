require('dotenv').config();

module.exports = {
  // Brevo (formerly Sendinblue) API configuration
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.EMAIL_FROM || 'noreply@mousepad.com',
    senderName: process.env.EMAIL_FROM_NAME || 'Mousepad Store'
  },
  
  // Admin email (recipient for order notifications)
  adminEmail: process.env.ADMIN_EMAIL || 'admin@mousepad.com',
  
  // Email settings
  enabled: process.env.EMAIL_ENABLED !== 'false', // Default to enabled unless explicitly disabled
};

