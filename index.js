require('dotenv').config();
const express = require('express');
const cors = require('cors');
const emailjs = require('@emailjs/nodejs');

const app = express();
const port = process.env.PORT || 3001;

// Initialize EmailJS with your public key
emailjs.init({
  publicKey: process.env.EMAILJS_PUBLIC_KEY,
  privateKey: process.env.EMAILJS_PRIVATE_KEY // Optional for added security
});

// Middleware
app.use(cors());
app.use(express.json());

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { name, email, phone, address, message } = req.body;

    const templateParams = {
      to_name: "Maine Drain Busters",
      from_name: name,
      from_email: email || 'No email provided',
      from_phone: phone || 'No phone provided',
      from_address: address || 'No address provided',
      message: message,
      reply_to: email || process.env.EMAILJS_DEFAULT_REPLY_TO,
    };

    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      templateParams
    );

    res.json({ success: true, response });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 