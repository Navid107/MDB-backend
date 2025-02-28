require('dotenv').config();
const express = require('express');
const cors = require('cors');
const emailjs = require('@emailjs/nodejs').default;

const app = express();
const port = process.env.PORT || 10000;

// Initialize EmailJS with your public key
emailjs.init({
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PUBLIC_KEY // For Node.js, we use the public key as private key
});

// Log environment variables (excluding sensitive values)
console.log('Environment Check:', {
  PORT: process.env.PORT,
  EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY ? 'Set' : 'Not Set',
  EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID ? 'Set' : 'Not Set',
  EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID ? 'Set' : 'Not Set',
  EMAILJS_DEFAULT_REPLY_TO: process.env.EMAILJS_DEFAULT_REPLY_TO ? 'Set' : 'Not Set'
});

// Middleware
app.use(cors());
app.use(express.json());

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { name, email, phone, address, message } = req.body;

    // Log the incoming request
    console.log('Received request body:', req.body);

    const templateParams = {
      to_name: "Maine Drain Busters",
      from_name: name,
      from_email: email || 'No email provided',
      from_phone: phone || 'No phone provided',
      from_address: address || 'No address provided',
      message: message,
      reply_to: email || process.env.EMAILJS_DEFAULT_REPLY_TO,
    };

    console.log('Attempting to send email with params:', templateParams);
    console.log('Using EmailJS config:', {
      serviceId: process.env.EMAILJS_SERVICE_ID,
      templateId: process.env.EMAILJS_TEMPLATE_ID,
      publicKey: process.env.EMAILJS_PUBLIC_KEY ? 'Set' : 'Not Set'
    });

    if (!process.env.EMAILJS_PUBLIC_KEY) {
      throw new Error('EmailJS public key is not set');
    }
    if (!process.env.EMAILJS_SERVICE_ID) {
      throw new Error('EmailJS service ID is not set');
    }
    if (!process.env.EMAILJS_TEMPLATE_ID) {
      throw new Error('EmailJS template ID is not set');
    }

    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Email sending failed. Full error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      response: error.response,
      data: error.data
    });
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: {
        name: error.name,
        code: error.code,
        response: error.response,
        data: error.data,
        env: {
          hasPublicKey: !!process.env.EMAILJS_PUBLIC_KEY,
          hasServiceId: !!process.env.EMAILJS_SERVICE_ID,
          hasTemplateId: !!process.env.EMAILJS_TEMPLATE_ID
        }
      }
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 