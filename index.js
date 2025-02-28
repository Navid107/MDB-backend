require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 10000;

// Create mail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD // This should be an app-specific password
  }
});

// Log environment check (excluding sensitive values)
console.log('Environment Check:', {
  PORT: process.env.PORT,
  EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not Set',
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ? 'Set' : 'Not Set',
  EMAIL_TO: process.env.EMAIL_TO ? 'Set' : 'Not Set'
});

// Middleware
app.use(cors());
app.use(express.json());

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { name, email, phone, address, message } = req.body;

    // Log the incoming request (excluding sensitive data)
    console.log('Received request from:', name);

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        details: { required: ['name', 'email', 'message'] }
      });
    }

    // Create email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      replyTo: email,
      subject: `New Contact Form Submission from ${name}`,
      text: `
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Address: ${address || 'Not provided'}

Message:
${message}
      `,
      html: `
<h2>New Contact Form Submission</h2>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
<p><strong>Address:</strong> ${address || 'Not provided'}</p>
<h3>Message:</h3>
<p>${message.replace(/\n/g, '<br>')}</p>
      `
    };

    // Log attempt (excluding sensitive data)
    console.log('Attempting to send email to:', process.env.EMAIL_TO);

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Log success
    console.log('Email sent successfully:', info.messageId);

    // Send success response
    res.json({
      success: true,
      messageId: info.messageId
    });

  } catch (error) {
    // Log error (safely)
    console.error('Email sending failed:', {
      name: error.name,
      message: error.message,
      code: error.code
    });

    // Send error response
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: {
        name: error.name,
        message: error.message,
        code: error.code
      }
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    emailServiceReady: !!process.env.EMAIL_USER && !!process.env.EMAIL_APP_PASSWORD
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 