const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Port configuration
const PORT = process.env.PORT || 3001;

// API Routes
app.post('/api/prepare-email', async (req, res) => {
  try {
    const { name, email, phone, message, subject, address, discount_claimed } = req.body;
    
    // Create configurations for both email templates
    const emailConfigs = {
      // Configuration for service provider notification
      serviceProvider: {
        serviceId: process.env.EMAILJS_SERVICE_PROVIDER_SERVICE_ID,
        templateId: process.env.EMAILJS_SERVICE_PROVIDER_TEMPLATE_ID,
        publicKey: process.env.EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY,
        templateParams: {
          client_name: name,
          client_email: email,
          client_phone: phone || 'Not provided',
          service_details: message,
          subject: subject || 'New Service Request',
          address: address || 'Not provided',
          discount_claimed: discount_claimed || ''
        }
      },
      // Configuration for client confirmation
      client: {
        serviceId: process.env.EMAILJS_SERVICE_PROVIDER_SERVICE_ID,
        templateId: process.env.EMAILJS_CLIENT_TEMPLATE_ID,
        publicKey: process.env.EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY,
        templateParams: {
          client_name: name,
          subject: subject || 'Service Request',
          service_details: message
        }
      }
    };

    // Return both configurations
    res.status(200).json({ 
      success: true,
      emailConfigs
    });
  } catch (error) {
    console.error('Error preparing email data:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to prepare email data', 
      error: error.message 
    });
  }
});

// Return EmailJS configuration for direct frontend use
app.get('/api/emailjs-config', (req, res) => {
  res.status(200).json({
    serviceProvider: {
      serviceId: process.env.EMAILJS_SERVICE_PROVIDER_SERVICE_ID,
      templateId: process.env.EMAILJS_SERVICE_PROVIDER_TEMPLATE_ID,
      publicKey: process.env.EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY,
      defaultReplyTo: process.env.EMAILJS_SERVICE_PROVIDER_DEFAULT_REPLY_TO
    },
    client: {
      serviceId: process.env.EMAILJS_SERVICE_PROVIDER_SERVICE_ID,
      templateId: process.env.EMAILJS_CLIENT_TEMPLATE_ID,
      publicKey: process.env.EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY
    }
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 