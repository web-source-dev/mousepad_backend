const brevo = require('@getbrevo/brevo');
const fs = require('fs');
const path = require('path');
const emailConfig = require('../config/email');

/**
 * Load and read the email template
 */
function loadEmailTemplate() {
  try {
    const templatePath = path.join(__dirname, '../templates/orderConfirmationEmail.html');
    return fs.readFileSync(templatePath, 'utf8');
  } catch (error) {
    console.error('Error loading email template:', error);
    return null;
  }
}

/**
 * Replace template placeholders with actual data
 */
function replaceTemplatePlaceholders(template, data) {
  let html = template;

  // Replace simple placeholders
  html = html.replace(/\{\{ORDER_ID\}\}/g, data.orderId || 'N/A');
  html = html.replace(/\{\{ORDER_DATE\}\}/g, data.orderDate || 'N/A');
  html = html.replace(/\{\{ORDER_STATUS\}\}/g, data.orderStatus || 'N/A');
  html = html.replace(/\{\{PAYMENT_STATUS\}\}/g, data.paymentStatus || 'N/A');
  html = html.replace(/\{\{CUSTOMER_NAME\}\}/g, data.customerName || 'N/A');
  html = html.replace(/\{\{CUSTOMER_EMAIL\}\}/g, data.customerEmail || 'N/A');
  html = html.replace(/\{\{CUSTOMER_PHONE\}\}/g, data.customerPhone || 'N/A');
  html = html.replace(/\{\{CUSTOMER_ADDRESS\}\}/g, data.customerAddress || 'N/A');
  html = html.replace(/\{\{ADDITIONAL_NOTES\}\}/g, data.additionalNotes || '');
  html = html.replace(/\{\{SUBTOTAL\}\}/g, data.subtotal || '0.00');
  html = html.replace(/\{\{SHIPPING\}\}/g, data.shipping || '0.00');
  html = html.replace(/\{\{TAX\}\}/g, data.tax || '0.00');
  html = html.replace(/\{\{TOTAL\}\}/g, data.total || '0.00');

  // Replace items list
  if (data.items && data.items.length > 0) {
    const itemsHtml = data.items.map(item => {
      return `
        <div class="item">
          <div class="item-name">${item.name || 'Custom Mousepad'}</div>
          <div class="item-details">
            <div><span class="item-detail-label">Quantity:</span> ${item.quantity || 1}</div>
            <div><span class="item-detail-label">Price:</span> ${data.currency || 'USD'} ${(item.price || 0).toFixed(2)}</div>
            <div><span class="item-detail-label">Type:</span> ${item.mousepadType || 'N/A'}</div>
            <div><span class="item-detail-label">Size:</span> ${item.mousepadSize || 'N/A'}</div>
            ${item.thickness ? `<div><span class="item-detail-label">Thickness:</span> ${item.thickness}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    html = html.replace(/\{\{ITEMS_LIST\}\}/g, itemsHtml);
  } else {
    html = html.replace(/\{\{ITEMS_LIST\}\}/g, '<p>No items in this order.</p>');
  }

  // Handle conditional blocks (simple implementation)
  if (!data.additionalNotes) {
    html = html.replace(/\{\{#if ADDITIONAL_NOTES\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  } else {
    html = html.replace(/\{\{#if ADDITIONAL_NOTES\}\}/g, '');
    html = html.replace(/\{\{\/if\}\}/g, '');
  }

  return html;
}

/**
 * Format currency amount
 */
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Format customer address
 */
function formatAddress(address) {
  if (!address) return 'N/A';
  
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zipCode,
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Send order confirmation email to admin
 * @param {Object} order - Order document from database
 * @returns {Promise<Object>} Result of email sending
 */
async function sendOrderConfirmationEmail(order) {
  // Check if email is enabled
  if (!emailConfig.enabled) {
    console.log('Email service is disabled. Skipping email send.');
    return { success: false, message: 'Email service is disabled' };
  }

  // Check if API key is configured
  if (!emailConfig.brevo.apiKey) {
    console.error('Brevo API key is not configured. Cannot send email.');
    return { success: false, message: 'Email API key not configured' };
  }

  try {
    // Load email template
    const template = loadEmailTemplate();
    if (!template) {
      throw new Error('Failed to load email template');
    }

    // Format order date
    const orderDate = new Date(order.createdAt || new Date()).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Prepare template data
    const templateData = {
      orderId: order._id.toString(),
      orderDate: orderDate,
      orderStatus: order.status || 'pending',
      paymentStatus: order.paymentStatus || 'pending',
      customerName: `${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() || 'N/A',
      customerEmail: order.customerInfo?.email || 'N/A',
      customerPhone: order.customerInfo?.phone || 'N/A',
      customerAddress: formatAddress(order.customerInfo?.address),
      additionalNotes: order.customerInfo?.additionalNotes || '',
      items: order.items || [],
      subtotal: formatCurrency(order.subtotal || 0, order.currency || 'USD'),
      shipping: formatCurrency(order.shipping || 0, order.currency || 'USD'),
      tax: formatCurrency(order.tax || 0, order.currency || 'USD'),
      total: formatCurrency(order.total || 0, order.currency || 'USD'),
      currency: order.currency || 'USD'
    };

    // Replace placeholders in template
    const htmlContent = replaceTemplatePlaceholders(template, templateData);

    // Brevo v3 API - Proper initialization
    // Create API instance
    const apiInstance = new brevo.TransactionalEmailsApi();
    
    // Set the API key in the authentications object
    // In Brevo v3, the authentication key is 'apiKey' (not 'api-key')
    apiInstance.authentications.apiKey.apiKey = emailConfig.brevo.apiKey;

    // Create email send request using SendSmtpEmail class
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.subject = `New Order Received - Order #${order._id.toString().slice(-8)}`;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = {
      name: emailConfig.brevo.senderName,
      email: emailConfig.brevo.senderEmail
    };
    sendSmtpEmail.to = [{
      email: emailConfig.adminEmail
    }];

    // Send email via Brevo
    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log('Order confirmation email sent successfully:', result.messageId);
    return {
      success: true,
      messageId: result.messageId,
      message: 'Email sent successfully'
    };

  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    // Don't throw error - email failure shouldn't break order creation
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

module.exports = {
  sendOrderConfirmationEmail
};

