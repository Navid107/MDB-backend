const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Allow localhost for development
app.use(cors({
  origin: [
    process.env.WEBSITE_URL
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true
}));
app.use(bodyParser.json());

// GoDaddy SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // GoDaddy's SMTP server
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER, // Should be support@mainedrainbusters.com
    pass: process.env.SMTP_PASS
  }
});

// Email template with proper styling
const createConfirmationEmail = (name) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Service Confirmation</title>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: #3CB8FB; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h2>Service Request Confirmation</h2>
          </div>
          <div class="content">
              <p>Dear ${name},</p>
              <p>Thank you for contacting Maine Drain Busters, we have received your service request form.</p>
              <p>We will contact you shortly regarding your form.</p>
              <p>If you have any questions, please email us at <strong>support@mainedrainbusters.com</strong></p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Maine Drain Busters</p>
          </div>
      </div>
  </body>
  </html>
  `;
};

// Enhanced email sender function
async function sendEmail({ to, from, subject, content, isHTML = false }) {
  try {
    const mailOptions = {
      from: `"Maine Drain Busters" <${from}>`,
      to,
      subject,
      replyTo: process.env.SMTP_USER, // Set proper reply-to address
      html: isHTML ? content : undefined,
      text: isHTML ? undefined : content
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent to:', to);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
}

// Updated route handler
app.post('/send-email', async (req, res) => {
  try {
    const { name, email: clientEmail, phone, message, address, discount_claimed } = req.body;

    // 1. Send to Company (appearing from client's email)
    const companyEmailSuccess = await sendEmail({
      from: clientEmail,
      to: process.env.SMTP_USER,
      subject: `New Service Request from ${name}`,
      content: `
      Client Details:
      Name: ${name}
      Email: ${clientEmail}
      Phone: ${phone}
      Address: ${address}
      Message: ${message}
      Discount Claimed: ${discount_claimed ? 'Yes' : 'No'}
      `
    });

    // 2. Send confirmation to Client (from company email)
    const clientEmailSuccess = await sendEmail({
      from: process.env.SMTP_USER,
      to: clientEmail,
      subject: 'Service Request Confirmation',
      content: createConfirmationEmail(name),
      isHTML: true
    });

    res.status(200).json({
      success: companyEmailSuccess && clientEmailSuccess,
      message: companyEmailSuccess && clientEmailSuccess 
        ? 'Both emails sent successfully' 
        : 'Partial email failure'
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});
// Add this new route handler before app.listen()
app.post('/support-email', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, message' 
      });
    }

    // 1. Send support request to your team (FROM your SMTP account)
    const supportSuccess = await sendEmail({
      from: `${email}`, // Must be your authenticated email
      to: process.env.SMTP_USER, // Send to yourself
      subject: `New Support Request from ${name}`,
      content: `
      New Support Message:
      From: ${name} <${email}>
      Message: ${message}
      `,
      headers: {
        'Reply-To': email // So replies go to client
      }
    });

    // 2. Send confirmation to client
    const confirmationSuccess = await sendEmail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Support Request Received',
      content: createSupportConfirmation(name),
      isHTML: true
    });

    res.status(200).json({
      success: supportSuccess && confirmationSuccess,
      message: supportSuccess && confirmationSuccess 
        ? 'Support request submitted successfully' 
        : 'Partial email failure'
    });

  } catch (error) {
    console.error('Support form error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Add this new template function with the others
const createSupportConfirmation = (name) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Support Request Confirmation</title>
      <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: #3CB8FB; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; }
          .footer { background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h2>Support Request Received</h2>
          </div>
           <div class="content">
              <p>Dear ${name},</p>
              <p>Thank you for contacting Maine Drain Busters!</p>
              <p>We will contact you shortly regarding your support request.</p>
              <p>If you have any questions, please email us at <strong>support@mainedrainbusters.com</strong></p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Maine Drain Busters</p>
          </div>
      </div>
  </body>
  </html>
  `;
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});