# Maine Drain Busters Backend Server

This is a Node.js backend server that works with EmailJS for handling email form submissions for the Maine Drain Busters website.

## How It Works

This backend serves as a proxy for EmailJS:

1. The backend securely stores your EmailJS credentials
2. When a form is submitted, the frontend requests the EmailJS configuration from the backend
3. The frontend uses this configuration to send emails directly via EmailJS's browser-based API
4. This approach keeps your EmailJS credentials secure while working with EmailJS's browser-only limitation

## Setup Instructions

### Local Development

1. **Install dependencies**
   ```
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3001
   EMAILJS_PUBLIC_KEY=your-public-key
   EMAILJS_SERVICE_ID=your-service-id
   EMAILJS_TEMPLATE_ID=your-template-id
   EMAILJS_DEFAULT_REPLY_TO=support@MaineDrainBusters.com
   ```

3. **Start the development server**
   ```
   npm run dev
   ```

### Deployment

You can deploy this backend server to several platforms:

#### Option 1: Heroku

1. Create a Heroku account if you don't have one
2. Install the Heroku CLI and log in
3. In your project root directory, run:
   ```
   heroku create maine-drain-busters-api
   git push heroku main
   ```
4. Set environment variables in Heroku Dashboard or via CLI:
   ```
   heroku config:set EMAILJS_PUBLIC_KEY=your-public-key
   heroku config:set EMAILJS_SERVICE_ID=your-service-id
   heroku config:set EMAILJS_TEMPLATE_ID=your-template-id
   heroku config:set EMAILJS_DEFAULT_REPLY_TO=support@MaineDrainBusters.com
   ```

#### Option 2: Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` to deploy
3. Configure environment variables in the Vercel dashboard

#### Option 3: Render

1. Create a Render account
2. Connect your GitHub repository
3. Create a new Web Service
4. Set environment variables in the Render dashboard

## API Endpoints

### Get EmailJS Configuration
- **URL**: `/api/emailjs-config`
- **Method**: `GET`
- **Response**: JSON with EmailJS configuration parameters

### Prepare Email Data
- **URL**: `/api/prepare-email`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-123-4567", // Optional
    "message": "I need help with my plumbing",
    "subject": "Plumbing Assistance" // Optional
  }
  ```
- **Response**: JSON with EmailJS configuration and template parameters

### Health Check
- **URL**: `/api/health`
- **Method**: `GET`
- **Response**: `{"status": "healthy"}`

## Front-end Integration

To integrate with your front-end React application, use EmailJS directly on the client side:

```javascript
import emailjs from '@emailjs/browser';

const ContactForm = () => {
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = {
      name: e.target.name.value,
      email: e.target.email.value,
      phone: e.target.phone?.value,
      message: e.target.message.value,
      subject: 'New Contact Form Submission'
    };
    
    try {
      // Option 1: Get EmailJS config from server and send directly
      const configResponse = await fetch('https://your-backend-url.com/api/emailjs-config');
      const config = await configResponse.json();
      
      // Send email directly using EmailJS
      const result = await emailjs.send(
        config.serviceId,
        config.templateId,
        {
          from_name: formData.name,
          reply_to: formData.email,
          phone: formData.phone || 'Not provided',
          message: formData.message,
          subject: formData.subject
        },
        config.publicKey
      );
      
      // Show success message
      
      // Option 2: Use the prepare-email endpoint
      // const response = await fetch('https://your-backend-url.com/api/prepare-email', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(formData),
      // });
      // 
      // const data = await response.json();
      // 
      // if (data.success) {
      //   const { serviceId, templateId, publicKey, templateParams } = data.emailjsConfig;
      //   await emailjs.send(serviceId, templateId, templateParams, publicKey);
      //   // Show success message
      // }
      
    } catch (error) {
      console.error('Error sending form:', error);
      // Show error message
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields here */}
    </form>
  );
};
``` 