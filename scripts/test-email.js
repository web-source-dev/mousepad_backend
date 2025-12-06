#!/usr/bin/env node

/**
 * Test script to send order confirmation email
 * 
 * Usage:
 *   node scripts/test-email.js                    # Send email for most recent order
 *   node scripts/test-email.js <orderId>          # Send email for specific order ID
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Order = require('../models/Order');
const { sendOrderConfirmationEmail } = require('../utils/emailService');

async function testEmail() {
  try {
    // Connect to database
    console.log('Connecting to database...');
    await connectDB();
    console.log('✓ Database connected\n');

    // Get order ID from command line arguments
    const orderId = process.argv[2];

    let order;

    if (orderId) {
      // Fetch specific order by ID
      console.log(`Fetching order with ID: ${orderId}...`);
      order = await Order.findById(orderId);
      
      if (!order) {
        console.error(`❌ Order not found with ID: ${orderId}`);
        process.exit(1);
      }
      console.log(`✓ Order found: ${order._id}\n`);
    } else {
      // Fetch most recent order
      console.log('Fetching most recent order...');
      order = await Order.findOne().sort({ createdAt: -1 });
      
      if (!order) {
        console.error('❌ No orders found in database');
        console.log('\nPlease create an order first, or specify an order ID:');
        console.log('  node scripts/test-email.js <orderId>');
        process.exit(1);
      }
      console.log(`✓ Found order: ${order._id}`);
      console.log(`  Customer: ${order.customerInfo?.firstName || 'N/A'} ${order.customerInfo?.lastName || 'N/A'}`);
      console.log(`  Total: ${order.currency || 'USD'} ${order.total || 0}\n`);
    }

    // Display order summary
    console.log('Order Details:');
    console.log('─'.repeat(50));
    console.log(`Order ID: ${order._id}`);
    console.log(`Status: ${order.status || 'N/A'}`);
    console.log(`Payment Status: ${order.paymentStatus || 'N/A'}`);
    console.log(`Customer: ${order.customerInfo?.firstName || ''} ${order.customerInfo?.lastName || ''}`.trim() || 'N/A');
    console.log(`Email: ${order.customerInfo?.email || 'N/A'}`);
    console.log(`Items: ${order.items?.length || 0}`);
    console.log(`Total: ${order.currency || 'USD'} ${order.total || 0}`);
    console.log('─'.repeat(50));
    console.log('');

    // Check email configuration
    console.log('Email Configuration:');
    const emailConfig = require('../config/email');
    if (!emailConfig.brevo.apiKey) {
      console.error('❌ BREVO_API_KEY is not set in environment variables');
      console.log('\nPlease set BREVO_API_KEY in your .env file');
      process.exit(1);
    }
    console.log(`✓ API Key: ${emailConfig.brevo.apiKey.substring(0, 10)}...`);
    console.log(`✓ From: ${emailConfig.brevo.senderEmail} (${emailConfig.brevo.senderName})`);
    console.log(`✓ To: ${emailConfig.adminEmail}`);
    console.log(`✓ Enabled: ${emailConfig.enabled ? 'Yes' : 'No'}\n`);

    if (!emailConfig.enabled) {
      console.error('❌ Email service is disabled');
      console.log('Set EMAIL_ENABLED=true in your .env file');
      process.exit(1);
    }

    // Send email
    console.log('Sending email...');
    const result = await sendOrderConfirmationEmail(order);

    if (result.success) {
      console.log('✓ Email sent successfully!');
      console.log(`  Message ID: ${result.messageId || 'N/A'}`);
      console.log(`  Sent to: ${emailConfig.adminEmail}`);
    } else {
      console.error('❌ Failed to send email');
      console.error(`  Error: ${result.error || result.message}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  }
}

// Run the test
testEmail();

