const express = require('express');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'WEBSITE_URL', 'SUPPORT_URL', 'SUPPORT_ACCOUNT'];
const missing = requiredEnvVars.filter(env => !process.env[env]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy with specific configuration for security
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// Initialize DOMPurify with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Security middleware
app.use(helmet());

// Rate limiting for email endpoints
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

app.use(generalLimiter);

// Middleware - Allow localhost for development
app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow mainedrainbusters.com and all its paths
      if (origin === process.env.WEBSITE_URL) {
        return callback(null, true);
      }
      
      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200 
  }));

// Set request size limits with proper error handling
app.use(bodyParser.json({ 
  limit: '100kb',
  verify: (req, res, buf, encoding) => {
    // This function runs before parsing, allowing us to handle size errors
    if (buf && buf.length >= 100 * 1024) {
      const error = new Error('Request payload too large');
      error.status = 413;
      error.type = 'entity.too.large';
      throw error;
    }
  }
}));

// Input validation functions
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

const validateName = (name) => {
  // Remove any characters that could cause header injection
  return name.replace(/[\r\n:;,]/g, '').trim();
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return purify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

// Maine Drain Busters SMTP configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // Your domain SMTP server
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  auth: {
    user: process.env.SMTP_USER, // Authenticated sending user
    pass: process.env.SMTP_PASS
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000, // 30 seconds
  socketTimeout: 60000, // 60 seconds
  pool: true,
  maxConnections: 5,
  maxMessages: 100
});


// Professional email template for company (service requests)
const createCompanyEmailTemplate = ({ name, email, phone, address, serviceType, urgency, message, preferredDate, preferredTime, discount_claimed, dealAmount }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Service Request</title>
    <style>
        /* Base Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f4f4;
            line-height: 1.5;
            color: #333333;
        }
        /* Responsive Styles */
        .wrapper {
            max-width: 750px;
            margin: 0 auto;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #092158;
            padding: 25px 20px;
            text-align: center;
            border-bottom: 4px solid rgb(255, 222, 6);
            position: relative;
        }
        .header h1 {
            color: rgb(255, 255, 253);
            font-size: 24px;
            margin: 0;
        }
        .header p {
            color: rgb(255, 222, 6);
            font-size: 16px;
            margin: 5px 0 0;
        }
        .content {
            padding: 30px;
        }
        .alert-bar {
            background-color: #dc3545;
            color: white;
            padding: 10px 15px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 25px;
            border-radius: 4px;
        }
        .summary-box {
            background-color: rgb(255, 222, 6, 0.15);
            border-left: 5px solid rgb(255, 222, 6);
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 0 4px 4px 0;
        }
        .summary-box h2 {
            color: #092158;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .summary-box p {
            color: #333333;
            font-size: 15px;
        }
        .status-badge {
            display: inline-block;
            background-color: #6c757d;
            color: white;
            padding: 5px 12px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 12px;
            margin: 0 0 0 10px;
            vertical-align: middle;
        }
        .status-urgent {
            background-color: #dc3545;
        }
        .status-high {
            background-color: #fd7e14;
        }
        .status-medium {
            background-color: #ffc107;
            color: #212529;
        }
        .status-low {
            background-color: #28a745;
        }
        .data-section {
            margin: 30px 0;
        }
        .section-header {
            background-color: #092158;
            color: white;
            padding: 12px 15px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 6px 6px 0 0;
            margin-bottom: 0;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 25px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            border: 1px solid #dee2e6;
            border-top: none;
            border-radius: 0 0 6px 6px;
            overflow: hidden;
        }
        .data-table th, 
        .data-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        .data-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #092158;
            width: 35%;
        }
        .data-table tr:last-child th,
        .data-table tr:last-child td {
            border-bottom: none;
        }
        .data-table td {
            background-color: white;
        }
        .data-table tr:nth-child(even) td {
            background-color: #f8f9fa;
        }
        .data-value {
            font-weight: 500;
        }
        .timestamp-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px 15px;
            margin: 25px 0;
            color: #666;
            font-size: 14px;
            text-align: center;
        }
        .message-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-left: 4px solid #092158;
            border-radius: 0 6px 6px 0;
            padding: 15px;
            margin: 20px 0;
        }
        .message-box h3 {
            color: #092158;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .message-content {
            background-color: white;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #e9ecef;
            font-style: italic;
            color: #333;
        }
        .action-section {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        .action-title {
            color: #092158;
            font-weight: bold;
            margin-bottom: 15px;
        }
        .action-buttons {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
        }
        .btn {
            display: inline-block;
            padding: 10px 15px;
            background-color: #092158;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            min-width: 120px;
            text-align: center;
        }
        .btn-primary {
            background-color: rgb(255, 222, 6);
            color: #092158;
        }
        .meta-info {
            background-color: #f1f3f9;
            border-radius: 6px;
            padding: 15px;
            margin: 25px 0 15px 0;
        }
        .meta-title {
            color: #092158;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .meta-row {
            display: flex;
            font-size: 13px;
            margin-bottom: 5px;
        }
        .meta-label {
            min-width: 120px;
            color: #666;
        }
        .meta-value {
            color: #333;
        }
        .footer {
            background-color: #092158;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 8px 8px;
        }
        .footer p {
            margin: 5px 0;
            font-size: 14px;
            color: rgb(255, 255, 253);
        }
        .footer .highlight {
            color: rgb(255, 222, 6);
        }
        
        /* Responsive adjustments */
        @media screen and (max-width: 767px) {
            .wrapper {
                width: 100%;
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
            .data-table th, 
            .data-table td {
                display: block;
                width: 100%;
            }
            .data-table th {
                border-bottom: none;
                padding-bottom: 5px;
            }
            .data-table td {
                padding-top: 5px;
                border-bottom: 1px solid #dee2e6;
            }
            .data-table tr:last-child td {
                border-bottom: none;
            }
            .action-buttons {
                flex-direction: column;
            }
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>NEW SERVICE REQUEST</h1>
                <p>Client Service Notification</p>
            </div>
            
            <!-- Content -->
            <div class="content">
                <div class="summary-box">
                    <h2>Service Request from ${name} <span class="status-badge ${urgency === 'Urgent' ? 'status-urgent' : urgency === 'High' ? 'status-high' : urgency === 'Medium' ? 'status-medium' : 'status-low'}">NEW</span></h2>
                    <p><strong>${serviceType || 'General Service'}</strong> service requested for ${preferredDate || 'Flexible date'} (${preferredTime || 'Flexible time'}) - <strong>Urgency: ${urgency || 'Standard'}</strong></p>
                </div>

                <div class="data-section">
                    <div class="section-header">Client Information</div>
                    <table class="data-table">
                        <tr>
                            <th>Full Name</th>
                            <td class="data-value">${name}</td>
                        </tr>
                        <tr>
                            <th>Phone Number</th>
                            <td class="data-value">${phone}</td>
                        </tr>
                        <tr>
                            <th>Email Address</th>
                            <td class="data-value">${email}</td>
                        </tr>
                        <tr>
                            <th>Service Address</th>
                            <td class="data-value">${address}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="data-section">
                    <div class="section-header">Service Details</div>
                    <table class="data-table">
                        <tr>
                            <th>Service Type</th>
                            <td class="data-value">${serviceType || 'General Service'}</td>
                        </tr>
                        <tr>
                            <th>Urgency Level</th>
                            <td class="data-value">${urgency || 'Standard'}</td>
                        </tr>
                        <tr>
                            <th>Preferred Date</th>
                            <td class="data-value">${preferredDate || 'Not specified'}</td>
                        </tr>
                        <tr>
                            <th>Preferred Time</th>
                            <td class="data-value">${preferredTime || 'Not specified'}</td>
                        </tr>
                        <tr>
                            <th>Promotional Deal</th>
                            <td class="data-value">${discount_claimed ? `Claimed ($${dealAmount})` : 'Not claimed'}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="message-box">
                    <h3>Client Message</h3>
                    <div class="message-content">
                        <p>${message}</p>
                    </div>
                </div>
                
                <div class="timestamp-box">
                    <strong>Request ID:</strong> REQ-${new Date().toISOString().slice(0,10).replace(/-/g, '')}-001 | 
                    <strong>Submitted:</strong> ${new Date().toLocaleString()}
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p class="highlight">Maine Drain Busters - Internal Service Management</p>
                <p>This email was sent to the Service Management Team</p>
                <p>© ${new Date().getFullYear()} Maine Drain Busters</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// Professional email template for company (support requests)
const createCompanySupportTemplate = ({ name, email, phone, message, subject }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Support Request</title>
    <style>
        /* Base Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f4f4;
            line-height: 1.5;
            color: #333333;
        }
        /* Responsive Styles */
        .wrapper {
            max-width: 750px;
            margin: 0 auto;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #092158;
            padding: 25px 20px;
            text-align: center;
            border-bottom: 4px solid rgb(255, 222, 6);
            position: relative;
        }
        .header h1 {
            color: rgb(255, 255, 253);
            font-size: 24px;
            margin: 0;
        }
        .header p {
            color: rgb(255, 222, 6);
            font-size: 16px;
            margin: 5px 0 0;
        }
        .content {
            padding: 30px;
        }
        .summary-box {
            background-color: rgb(255, 222, 6, 0.15);
            border-left: 5px solid rgb(255, 222, 6);
            padding: 15px;
            margin-bottom: 25px;
            border-radius: 0 4px 4px 0;
        }
        .summary-box h2 {
            color: #092158;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .summary-box p {
            color: #333333;
            font-size: 15px;
        }
        .status-badge {
            display: inline-block;
            background-color: #6c757d;
            color: white;
            padding: 5px 12px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 12px;
            margin: 0 0 0 10px;
            vertical-align: middle;
        }
        .status-support {
            background-color: #0d6efd;
        }
        .data-section {
            margin: 30px 0;
        }
        .section-header {
            background-color: #092158;
            color: white;
            padding: 12px 15px;
            font-size: 16px;
            font-weight: bold;
            border-radius: 6px 6px 0 0;
            margin-bottom: 0;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 25px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            border: 1px solid #dee2e6;
            border-top: none;
            border-radius: 0 0 6px 6px;
            overflow: hidden;
        }
        .data-table th, 
        .data-table td {
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        .data-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #092158;
            width: 35%;
        }
        .data-table tr:last-child th,
        .data-table tr:last-child td {
            border-bottom: none;
        }
        .data-table td {
            background-color: white;
        }
        .data-table tr:nth-child(even) td {
            background-color: #f8f9fa;
        }
        .data-value {
            font-weight: 500;
        }
        .timestamp-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 12px 15px;
            margin: 25px 0;
            color: #666;
            font-size: 14px;
            text-align: center;
        }
        .message-box {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-left: 4px solid #0d6efd;
            border-radius: 0 6px 6px 0;
            padding: 15px;
            margin: 20px 0;
        }
        .message-box h3 {
            color: #092158;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .message-content {
            background-color: white;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #e9ecef;
            font-style: italic;
            color: #333;
        }
        .footer {
            background-color: #092158;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 8px 8px;
        }
        .footer p {
            margin: 5px 0;
            font-size: 14px;
            color: rgb(255, 255, 253);
        }
        .footer .highlight {
            color: rgb(255, 222, 6);
        }
        
        /* Responsive adjustments */
        @media screen and (max-width: 767px) {
            .wrapper {
                width: 100%;
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
            .data-table th, 
            .data-table td {
                display: block;
                width: 100%;
            }
            .data-table th {
                border-bottom: none;
                padding-bottom: 5px;
            }
            .data-table td {
                padding-top: 5px;
                border-bottom: 1px solid #dee2e6;
            }
            .data-table tr:last-child td {
                border-bottom: none;
            }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>NEW SUPPORT REQUEST</h1>
                <p>Customer Support Notification</p>
            </div>
            
            <!-- Content -->
            <div class="content">
                <div class="summary-box">
                    <h2>Support Request from ${name} <span class="status-badge status-support">SUPPORT</span></h2>
                    <p><strong>Subject:</strong> ${subject || 'General Support'}</p>
                </div>

                <div class="data-section">
                    <div class="section-header">Contact Information</div>
                    <table class="data-table">
                        <tr>
                            <th>Full Name</th>
                            <td class="data-value">${name}</td>
                        </tr>
                        <tr>
                            <th>Email Address</th>
                            <td class="data-value">${email}</td>
                        </tr>
                        <tr>
                            <th>Phone Number</th>
                            <td class="data-value">${phone || 'Not provided'}</td>
                        </tr>
                        <tr>
                            <th>Submitted</th>
                            <td class="data-value">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>
                </div>
                
                <div class="message-box">
                    <h3>Support Message</h3>
                    <div class="message-content">
                        <p>${message}</p>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p class="highlight">Maine Drain Busters - Internal Support System</p>
                <p>This email was sent to the Customer Support Team</p>
                <p>© ${new Date().getFullYear()} Maine Drain Busters</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// Enhanced email template with Maine Drain Busters branding (Client Confirmation)
const createConfirmationEmail = ({ name, serviceType, phone, preferredDate, preferredTime, submissionTime }) => {
  // Format date and time information
  const formattedSubmissionTime = new Date(submissionTime || Date.now()).toLocaleString();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Request Confirmation</title>
    <style>
        /* Base Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f4f4;
            line-height: 1.5;
            color: #333333;
        }
        /* Responsive Styles */
        .wrapper {
            max-width: 600px;
            margin: 0 auto;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #092158;
            padding: 25px 20px;
            text-align: center;
            border-bottom: 4px solid rgb(255, 222, 6);
        }
        .header h1 {
            color: rgb(255, 255, 253);
            font-size: 22px;
            margin: 0;
        }
        .header p {
            color: rgb(255, 222, 6);
            font-size: 16px;
            margin: 5px 0 0;
        }
        .content {
            padding: 30px;
        }
        .confirmation-box {
            background-color: #f9f9f9;
            border-left: 4px solid rgb(255, 222, 6);
            padding: 20px;
            margin-bottom: 25px;
        }
        .confirmation-box h2 {
            color: #092158;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .service-details {
            background-color: #f5f8ff;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .detail-row {
            display: flex;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .detail-label {
            width: 130px;
            font-weight: bold;
            color: #092158;
        }
        .detail-value {
            flex: 1;
            color: #333;
        }
        .contact-info {
            background-color: #092158;
            color: white;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
        }
        .contact-info a {
            color: rgb(255, 222, 6);
            text-decoration: none;
            font-weight: bold;
        }
        .footer {
            background-color: #092158;
            padding: 20px;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
            font-size: 14px;
            color: rgb(255, 255, 253);
        }
        .footer .highlight {
            color: rgb(255, 222, 6);
        }
        
        .status-badge {
            display: inline-block;
            background-color: #28a745;
            color: white;
            padding: 5px 15px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 14px;
            margin: 10px 0;
        }
        
        /* Responsive adjustments */
        @media screen and (max-width: 600px) {
            .wrapper {
                width: 100%;
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
            .detail-row {
                flex-direction: column;
                margin-bottom: 15px;
            }
            .detail-label {
                width: 100%;
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>MAINE DRAIN BUSTERS</h1>
                <p>Service Request Confirmation</p>
            </div>
            
            <!-- Content -->
            <div class="content">
                <p style="margin-bottom: 20px; font-size: 16px;">Dear <strong>${name}</strong>,</p>
                
                <div class="confirmation-box">
                    <h2>✓ Service Request Successfully Received</h2>
                    <p>Thank you for choosing Maine Drain Busters for your plumbing and drainage needs.</p>
                    <div class="status-badge">CONFIRMED</div>
                </div>
                
                <p>We've recorded your service request with the following details:</p>
                
                <div class="service-details">
                    <div class="detail-row">
                        <div class="detail-label">Service Type:</div>
                        <div class="detail-value"><strong>${serviceType || 'General Service'}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Contact Phone:</div>
                        <div class="detail-value"><strong>${phone || 'Not provided'}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Preferred Date:</div>
                        <div class="detail-value"><strong>${preferredDate || 'Flexible'}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Preferred Time:</div>
                        <div class="detail-value"><strong>${preferredTime || 'Flexible'}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Submitted:</div>
                        <div class="detail-value"><strong>${formattedSubmissionTime}</strong></div>
                    </div>
                </div>
                
                <p><strong>Next Steps:</strong> Our experienced team will contact you within <strong>24 hours</strong> to confirm your appointment details.</p>
                
                <div class="contact-info">
                    <p>Have questions? Reach us at:</p>
                    <p><a href="mailto:support@mainedrainbusters.com">support@mainedrainbusters.com</a></p>
                    <p>Call: <strong>(207) 409-9772</strong></p>
                </div>
                
                <div class="no-reply-warning">
                    ⚠️ DO NOT REPLY TO THIS EMAIL - THIS IS AN AUTOMATED MESSAGE
                </div>
                
                <p style="text-align: center; margin-top: 20px;">Thank you for trusting Maine's premier plumbing professionals!</p>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p class="highlight">Professional Plumbing & Drainage Services</p>
                <p>Serving Greater Portland, Maine & Surrounding Areas</p>
                <p>© ${new Date().getFullYear()} Maine Drain Busters</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// Enhanced email sender function with improved error handling
async function sendEmail({ to, subject, content, isHTML = false, headers = {} }) {
  try {
    // Validate email address
    if (!validateEmail(to)) {
      throw new Error('Invalid email address');
    }

    const mailOptions = {
      from: `"Maine Drain Busters" <${process.env.SMTP_USER}>`, // Always from authenticated user
      to,
      subject: sanitizeInput(subject),
      html: isHTML ? content : undefined,
      text: isHTML ? undefined : content,
      headers: headers // Add custom headers
    };

    const info = await transporter.sendMail(mailOptions);
    //console.log(`Email sent successfully to: ${to.replace(/(.{3}).*(@.*)/, '$1***$2')}`); // Partially mask email in logs
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    console.error(`Email error [${errorId}]:`, {
      error: error.message,
      to: to.replace(/(.{3}).*(@.*)/, '$1***$2'), // Mask email in error logs
      timestamp: new Date().toISOString()
    });
    return { success: false, errorId };
  }
}

// Service request validation middleware
const serviceRequestValidation = [
  body('firstName').trim().isLength({ min: 1, max: 50 }).escape(),
  body('lastName').trim().isLength({ min: 1, max: 50 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('address').trim().isLength({ min: 1, max: 200 }).escape(),
  body('city').trim().isLength({ min: 1, max: 100 }).escape(),
  body('state').trim().isLength({ min: 2, max: 50 }).escape(),
  body('zipCode').trim().isPostalCode('US'),
  body('serviceType').trim().isLength({ min: 1, max: 100 }).escape(),
  body('urgency').optional().isIn(['Low', 'Medium', 'High', 'Urgent']),
  body('description').trim().isLength({ min: 10, max: 1000 }).escape(),
  body('preferredDate').optional().isDate(),
  body('preferredTime').optional().trim().isLength({ max: 50 }).escape(),
  body('claimDeal').optional().isBoolean(),
  body('dealAmount').optional().isNumeric()
];

// Updated route handler with security improvements
app.post('/send-email', emailLimiter, serviceRequestValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email: clientEmail,
      phone,
      address,
      city,
      state,
      zipCode,
      serviceType,
      urgency,
      description,
      preferredDate,
      preferredTime,
      claimDeal,
      dealAmount
    } = req.body;

    // Sanitize inputs
    const sanitizedData = {
      firstName: sanitizeInput(firstName),
      lastName: sanitizeInput(lastName),
      clientEmail: clientEmail.toLowerCase(),
      phone: sanitizeInput(phone),
      address: sanitizeInput(address),
      city: sanitizeInput(city),
      state: sanitizeInput(state),
      zipCode: sanitizeInput(zipCode),
      serviceType: sanitizeInput(serviceType),
      urgency: sanitizeInput(urgency),
      description: sanitizeInput(description),
      preferredDate: sanitizeInput(preferredDate),
      preferredTime: sanitizeInput(preferredTime),
      claimDeal,
      dealAmount
    };

    // Combine name and address fields
    const name = `${sanitizedData.firstName} ${sanitizedData.lastName}`.trim();
    const fullAddress = [sanitizedData.address, sanitizedData.city, sanitizedData.state, sanitizedData.zipCode].filter(Boolean).join(', ');

    // Validate email for headers
    const safeReplyTo = validateEmail(sanitizedData.clientEmail) ? 
      `${validateName(name)} <${sanitizedData.clientEmail}>` : undefined;

    // 1. Send to Company (SUPPORT_ACCOUNT only)
    const companyEmailResult = await sendEmail({
      to: process.env.SUPPORT_ACCOUNT,
      subject: `Service Request from ${name}`,
      content: createCompanyEmailTemplate({
        name,
        email: sanitizedData.clientEmail,
        phone: sanitizedData.phone,
        address: fullAddress,
        serviceType: sanitizedData.serviceType,
        urgency: sanitizedData.urgency,
        message: sanitizedData.description,
        preferredDate: sanitizedData.preferredDate,
        preferredTime: sanitizedData.preferredTime,
        discount_claimed: sanitizedData.claimDeal,
        dealAmount: sanitizedData.dealAmount
      }),
      isHTML: true,
      headers: safeReplyTo ? { 'Reply-To': safeReplyTo } : {}
    });

    // 2. Send confirmation to Client (from authenticated user)
    const clientEmailResult = await sendEmail({
      to: sanitizedData.clientEmail,
      subject: 'Service Request Confirmation',
      content: createConfirmationEmail({
        name,
        serviceType: sanitizedData.serviceType,
        phone: sanitizedData.phone,
        preferredDate: sanitizedData.preferredDate,
        preferredTime: sanitizedData.preferredTime,
        submissionTime: new Date()
      }),
      isHTML: true
    });

    const bothSuccessful = companyEmailResult.success && clientEmailResult.success;

    res.status(200).json({
      success: bothSuccessful,
      message: bothSuccessful
        ? 'Both emails sent successfully'
        : 'Partial email failure',
      ...((!companyEmailResult.success || !clientEmailResult.success) && {
        errorIds: [
          !companyEmailResult.success ? companyEmailResult.errorId : null,
          !clientEmailResult.success ? clientEmailResult.errorId : null
        ].filter(Boolean)
      })
    });

  } catch (error) {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    console.error(`Server error [${errorId}]:`, {
      error: error.message,
      timestamp: new Date().toISOString(),
      endpoint: '/send-email'
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      errorId
    });
  }
});
// Support request validation middleware
const supportRequestValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('subject').optional().trim().isLength({ max: 200 }).escape(),
  body('message').trim().isLength({ min: 10, max: 2000 }).escape()
];

// Support email route with security improvements
app.post('/support-email', emailLimiter, supportRequestValidation, async (req, res) => {
  try {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input data',
        details: errors.array()
      });
    }

    const {
      name,
      email,
      phone,
      subject,
      message
    } = req.body;

    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(name),
      email: email.toLowerCase(),
      phone: sanitizeInput(phone),
      subject: sanitizeInput(subject),
      message: sanitizeInput(message)
    };

    // Validate email for headers
    const safeReplyTo = validateEmail(sanitizedData.email) ? 
      `${validateName(sanitizedData.name)} <${sanitizedData.email}>` : undefined;

    // 1. Send support request to company (SUPPORT_ACCOUNT only)
    const supportResult = await sendEmail({
      to: process.env.SUPPORT_ACCOUNT,
      subject: `Support Request from ${sanitizedData.name}${sanitizedData.subject ? ` - ${sanitizedData.subject}` : ''}`,
      content: createCompanySupportTemplate({
        name: sanitizedData.name,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        message: sanitizedData.message,
        subject: sanitizedData.subject
      }),
      isHTML: true,
      headers: safeReplyTo ? { 'Reply-To': safeReplyTo } : {}
    });

    // 2. Send confirmation to client (from authenticated user)
    const confirmationResult = await sendEmail({
      to: sanitizedData.email,
      subject: 'Support Request Received',
      content: createSupportConfirmation({
        name: sanitizedData.name,
        email: sanitizedData.email,
        phone: sanitizedData.phone,
        subject: sanitizedData.subject,
        message: sanitizedData.message,
        submissionTime: new Date()
      }),
      isHTML: true
    });

    const bothSuccessful = supportResult.success && confirmationResult.success;

    res.status(200).json({
      success: bothSuccessful,
      message: bothSuccessful 
        ? 'Support request submitted successfully' 
        : 'Partial email failure',
      ...((!supportResult.success || !confirmationResult.success) && {
        errorIds: [
          !supportResult.success ? supportResult.errorId : null,
          !confirmationResult.success ? confirmationResult.errorId : null
        ].filter(Boolean)
      })
    });

  } catch (error) {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    console.error(`Server error [${errorId}]:`, {
      error: error.message,
      timestamp: new Date().toISOString(),
      endpoint: '/support-email'
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      errorId
    });
  }
});

// Enhanced support confirmation template with Maine Drain Busters branding (Client Confirmation)
const createSupportConfirmation = ({ name, email, phone, subject, message, submissionTime }) => {
  // Format date and time information
  const formattedSubmissionTime = new Date(submissionTime || Date.now()).toLocaleString();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Support Request Confirmation</title>
    <style>
        /* Base Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f4f4;
            line-height: 1.5;
            color: #333333;
        }
        /* Responsive Styles */
        .wrapper {
            max-width: 600px;
            margin: 0 auto;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #092158;
            padding: 25px 20px;
            text-align: center;
            border-bottom: 4px solid rgb(255, 222, 6);
        }
        .header h1 {
            color: rgb(255, 255, 253);
            font-size: 22px;
            margin: 0;
        }
        .header p {
            color: rgb(255, 222, 6);
            font-size: 16px;
            margin: 5px 0 0;
        }
        .content {
            padding: 30px;
        }
        .confirmation-box {
            background-color: #f9f9f9;
            border-left: 4px solid #28a745;
            padding: 20px;
            margin-bottom: 25px;
        }
        .confirmation-box h2 {
            color: #28a745;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .support-details {
            background-color: #f5f8ff;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .detail-row {
            display: flex;
            margin-bottom: 12px;
            flex-wrap: wrap;
        }
        .detail-label {
            width: 130px;
            font-weight: bold;
            color: #092158;
        }
        .detail-value {
            flex: 1;
            color: #333;
        }
        .message-preview {
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-style: italic;
            color: #495057;
        }
        .no-reply-warning {
            background-color: #dc3545;
            color: white;
            padding: 10px;
            text-align: center;
            border-radius: 4px 4px 0 0;
            margin: 15px 0 0 0;
            font-size: 14px;
            font-weight: bold;
        }
        .footer {
            background-color: #092158;
            padding: 20px;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
            font-size: 14px;
            color: rgb(255, 255, 253);
        }
        .footer .highlight {
            color: rgb(255, 222, 6);
        }
        
        .status-badge {
            display: inline-block;
            background-color: #28a745;
            color: white;
            padding: 5px 15px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 14px;
            margin: 10px 0;
        }
        
        /* Responsive adjustments */
        @media screen and (max-width: 600px) {
            .wrapper {
                width: 100%;
                padding: 10px;
            }
            .content {
                padding: 20px;
            }
            .detail-row {
                flex-direction: column;
                margin-bottom: 15px;
            }
            .detail-label {
                width: 100%;
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>MAINE DRAIN BUSTERS</h1>
                <p>Support Request Confirmation</p>
            </div>
            
            <!-- Content -->
            <div class="content">
                <p style="margin-bottom: 20px; font-size: 16px;">Dear <strong>${name}</strong>,</p>
                
                <div class="confirmation-box">
                    <h2>✓ Your Support Request Has Been Received</h2>
                    <p>Thank you for contacting Maine Drain Busters. <Strong>We'll Get Back to You Within 24 Hours</Strong></p>
                    <div class="status-badge">RECEIVED</div>
                </div>
                
                <div class="support-details">
                    <div class="detail-row">
                        <div class="detail-label">Subject:</div>
                        <div class="detail-value"><strong>${subject || 'General Support'}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Contact Email:</div>
                        <div class="detail-value"><strong>${email}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Contact Phone:</div>
                        <div class="detail-value"><strong>${phone || 'Not provided'}</strong></div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Submitted:</div>
                        <div class="detail-value"><strong>${formattedSubmissionTime}</strong></div>
                    </div>
                </div>
                
                <div class="message-preview">
                    <p><strong>Your message:</strong></p>
                    <p>${message}</p>
                </div>
                
                <div class="no-reply-warning">
                    ⚠️ DO NOT REPLY TO THIS EMAIL - THIS IS AN AUTOMATED MESSAGE
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p class="highlight">Professional Plumbing & Drainage Services</p>
                <p>Serving Greater Portland, Maine & Surrounding Areas</p>
                <p>© ${new Date().getFullYear()} Maine Drain Busters</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// Global error handler for handling payload size and other errors
app.use((error, req, res, next) => {
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  // Handle payload too large errors
  if (error.status === 413 || error.type === 'entity.too.large' || error.message.includes('request entity too large')) {
    console.error(`Payload too large error [${errorId}]:`, {
      error: 'Request payload exceeds size limit',
      ip: req.ip,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(413).json({
      success: false,
      error: 'Request payload too large. Maximum size is 100KB.',
      errorId
    });
  }
  
  // Handle validation errors from express-validator
  if (error.type === 'entity.parse.failed') {
    console.error(`JSON parse error [${errorId}]:`, {
      error: 'Invalid JSON in request body',
      ip: req.ip,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON format in request body',
      errorId
    });
  }
  
  // Handle other errors
  console.error(`Unhandled error [${errorId}]:`, {
    error: error.message,
    stack: error.stack,
    ip: req.ip,
    endpoint: req.path,
    timestamp: new Date().toISOString()
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    errorId
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});