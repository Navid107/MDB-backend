const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const emailjs = require('@emailjs/nodejs');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// CORS Configuration
const corsOptions = {
  origin: process.env.WEBSITE_URL, // Replace with your frontend domain
  methods: ['GET', 'POST'], // Allow only GET and POST requests
  allowedHeaders: ['Content-Type', 'Authorization'], // Allow specific headers
  credentials: true // Allow cookies and credentials (if needed)
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());

// Port configuration
const PORT = process.env.PORT || 3001;

// Handle preflight requests
app.options('/api/prepare-email', cors(corsOptions));

// API Routes

/**
 * POST /api/prepare-email
 * Prepares and sends emails using EmailJS
 */
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

    // Send service provider email
    const serviceProviderResult = await emailjs.send(
      process.env.EMAILJS_SERVICE_PROVIDER_SERVICE_ID,
      process.env.EMAILJS_SERVICE_PROVIDER_TEMPLATE_ID,
      {
        client_name: name,
        client_email: email,
        client_phone: phone || 'Not provided',
        service_details: message,
        address: address || 'Not provided',
        discount_claimed: discount_claimed || 'No'
      },
      {
        publicKey: process.env.EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY
      }
    );

    // Send client email
    const clientResult = await emailjs.send(
      process.env.EMAILJS_SERVICE_PROVIDER_SERVICE_ID,
      process.env.EMAILJS_CLIENT_TEMPLATE_ID,
      {
        client_name: name,
        to_email: email,
        service_details: message
      },
      {
        publicKey: process.env.EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY
      }
    );

    // Return success response
    res.status(200).json({ 
      success: true,
      message: 'Emails sent successfully'
    });
  } catch (error) {
    console.error('Error sending emails:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send emails', 
      error: error.message 
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error', 
    error: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});