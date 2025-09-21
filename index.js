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
    process.env.WEBSITE_URL ,
    process.env.SUPPORT_URL
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

// Enhanced email template with Maine Drain Busters branding
const createConfirmationEmail = (name) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Service Request Confirmation - Maine Drain Busters</title>
      <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #2d4a7c 100%); color: white; padding: 30px 20px; text-align: center; }
          .logo { font-size: 28px; font-weight: bold; color: #ffd700; margin-bottom: 10px; }
          .header h2 { margin: 0; font-size: 24px; color: white; }
          .content { padding: 40px 30px; }
          .highlight-box { background: #f8f9fa; border-left: 4px solid #ffd700; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .contact-info { background: #1a1a2e; color: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .contact-info .phone { font-size: 20px; font-weight: bold; color: #ffd700; margin: 10px 0; }
          .footer { background: #1a1a2e; color: #ffd700; padding: 20px; text-align: center; }
          .footer p { margin: 5px 0; }
          .services-badge { display: inline-block; background: #ffd700; color: #1a1a2e; padding: 5px 15px; border-radius: 20px; font-weight: bold; margin: 5px; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <div class="logo">🔧 Maine Drain Busters</div>
              <h2>Service Request Confirmation</h2>
          </div>
          <div class="content">
              <p><strong>Dear ${name},</strong></p>
              
              <div class="highlight-box">
                  <p><strong>✅ Your service request has been received!</strong></p>
                  <p>Thank you for choosing Maine Drain Busters for your plumbing and drainage needs. We truly appreciate your trust in our professional services.</p>
              </div>
              
              <p>Our experienced team will contact you within <strong>24 hours</strong> to:</p>
              <ul>
                  <li>Confirm your appointment details</li>
                  <li>Discuss your specific service needs</li>
                  <li>Provide accurate pricing information</li>
                  <li>Schedule at your convenience</li>
              </ul>
              
              <div class="contact-info">
                  <p><strong>Need immediate assistance?</strong></p>
                  <div class="phone">📞 (207) 409-9772</div>
                  <p>Available 24/7 for Emergency Services</p>
              </div>
              
              <p><strong>Our Services Include:</strong></p>
              <div style="text-align: center; margin: 20px 0;">
                  <span class="services-badge">Emergency Plumbing</span>
                  <span class="services-badge">Drain Cleaning</span>
                  <span class="services-badge">Water Heaters</span>
                  <span class="services-badge">Sewer Services</span>
                  <span class="services-badge">Water Quality</span>
              </div>
              
              <p>If you have any questions before we contact you, please email us at <strong>support@mainedrainbusters.com</strong> or call the number above.</p>
              
              <p>Thank you for choosing Maine's trusted plumbing professionals!</p>
              
              <p><strong>The Maine Drain Busters Team</strong><br>
              <em>Licensed • Insured • Professional</em></p>
          </div>
          <div class="footer">
              <p><strong>&copy; ${new Date().getFullYear()} Maine Drain Busters</strong></p>
              <p>Professional Plumbing & Drainage Services</p>
              <p>Serving Greater Portland, Maine & Surrounding Areas</p>
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

// Enhanced support confirmation template with Maine Drain Busters branding
const createSupportConfirmation = (name) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Support Request Received - Maine Drain Busters</title>
      <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f8f9fa; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); overflow: hidden; }
          .header { background: linear-gradient(135deg, #1a1a2e 0%, #2d4a7c 100%); color: white; padding: 30px 20px; text-align: center; }
          .logo { font-size: 28px; font-weight: bold; color: #ffd700; margin-bottom: 10px; }
          .header h2 { margin: 0; font-size: 24px; color: white; }
          .content { padding: 40px 30px; }
          .highlight-box { background: #f8f9fa; border-left: 4px solid #ffd700; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .contact-info { background: #1a1a2e; color: white; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }
          .contact-info .phone { font-size: 20px; font-weight: bold; color: #ffd700; margin: 10px 0; }
          .footer { background: #1a1a2e; color: #ffd700; padding: 20px; text-align: center; }
          .footer p { margin: 5px 0; }
          .response-time { background: #e8f5e8; border: 2px solid #4caf50; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <div class="logo">💬 Maine Drain Busters</div>
              <h2>Support Request Received</h2>
          </div>
          <div class="content">
              <p><strong>Dear ${name},</strong></p>
              
              <div class="highlight-box">
                  <p><strong>✅ Your support request has been received!</strong></p>
                  <p>Thank you for contacting Maine Drain Busters. We appreciate you taking the time to reach out to us.</p>
              </div>
              
              <div class="response-time">
                  <p><strong>📞 We'll get back to you within 24 hours</strong></p>
                  <p>Our customer support team will review your message and respond promptly.</p>
              </div>
              
              <p><strong>What happens next?</strong></p>
              <ul>
                  <li>Our support team will review your message</li>
                  <li>We'll contact you via your preferred method</li>
                  <li>If urgent, we'll prioritize your request</li>
                  <li>You'll receive professional assistance</li>
              </ul>
              
              <div class="contact-info">
                  <p><strong>Need immediate assistance?</strong></p>
                  <div class="phone">📞 (207) 409-9772</div>
                  <p>Available 24/7 for Emergency Services</p>
              </div>
              
              <p>For future reference, you can also email us directly at <strong>support@mainedrainbusters.com</strong></p>
              
              <p>Thank you for choosing Maine Drain Busters!</p>
              
              <p><strong>The Maine Drain Busters Support Team</strong><br>
              <em>Here to help with all your plumbing needs</em></p>
          </div>
          <div class="footer">
              <p><strong>&copy; ${new Date().getFullYear()} Maine Drain Busters</strong></p>
              <p>Professional Plumbing & Drainage Services</p>
              <p>Serving Greater Portland, Maine & Surrounding Areas</p>
          </div>
      </div>
  </body>
  </html>
  `;
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});