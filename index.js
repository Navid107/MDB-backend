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
    const { name, email, phone, message, subject } = req.body;
    
    // Instead of sending the email directly, return the configuration
    // that the frontend will use with EmailJS
    res.status(200).json({ 
      success: true,
      emailjsConfig: {
        serviceId: process.env.EMAILJS_SERVICE_ID,
        templateId: process.env.EMAILJS_TEMPLATE_ID,
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        templateParams: {
          from_name: name,
          reply_to: email,
          phone: phone || 'Not provided',
          message: message,
          subject: subject || 'New message from Maine Drain Busters website'
        }
      }
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
    serviceId: process.env.EMAILJS_SERVICE_ID,
    templateId: process.env.EMAILJS_TEMPLATE_ID,
    publicKey: process.env.EMAILJS_PUBLIC_KEY,
    defaultReplyTo: process.env.EMAILJS_DEFAULT_REPLY_TO
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