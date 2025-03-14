const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

const corsOptions = {
  origin: 'https://your-frontend-domain.com', // Replace with your frontend URL
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Port configuration
const PORT = process.env.PORT || 3001;

// API Routes
app.post('/api/prepare-email', async (req, res) => {
  try {
    const { name, email, phone, message, address, discount_claimed } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: name, email, message' 
      });
    }
    // Create configurations for both email templates
    const emailConfigs = {
        serviceProvider: {
          serviceId: process.env.EMAILJS_SERVICE_PROVIDER_SERVICE_ID,
          templateId: process.env.EMAILJS_SERVICE_PROVIDER_TEMPLATE_ID,
          publicKey: process.env.EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY,
          templateParams: {
            client_name: name,
            client_email: email,
            client_phone: phone || 'Not provided',
            service_details: message,
            address: address || 'Not provided',
            discount_claimed: discount_claimed || 'No'
          }
      },
      // Configuration for client confirmation
      client: {
        serviceId: process.env.EMAILJS_SERVICE_PROVIDER_SERVICE_ID,
        templateId: process.env.EMAILJS_CLIENT_TEMPLATE_ID,
        publicKey: process.env.EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY,
        templateParams: {
          client_name: name,
          to_email: email,
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