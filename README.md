# Maine Drain Busters Backend Server

This is a Node.js backend server that works with EmailJS for handling email form submissions for the Maine Drain Busters website.

## How It Works

This backend serves as a proxy for EmailJS and supports sending two types of emails:

1. Service provider notification - Notifies your business about new service requests
2. Client confirmation - Sends a confirmation email to the customer

The backend:
1. Securely stores your EmailJS credentials
2. When a form is submitted, it prepares data for both email templates
3. The frontend uses this data to send emails directly via EmailJS's browser-based API
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
   EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY=your-public-key
   EMAILJS_SERVICE_PROVIDER_SERVICE_ID=your-service-id
   EMAILJS_SERVICE_PROVIDER_TEMPLATE_ID=your-template-id
   EMAILJS_SERVICE_PROVIDER_DEFAULT_REPLY_TO=support@MaineDrainBusters.com
   EMAILJS_CLIENT_TEMPLATE_ID=your-client-template-id
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
   heroku config:set EMAILJS_SERVICE_PROVIDER_PUBLIC_KEY=your-public-key
   heroku config:set EMAILJS_SERVICE_PROVIDER_SERVICE_ID=your-service-id
   heroku config:set EMAILJS_SERVICE_PROVIDER_TEMPLATE_ID=your-template-id
   heroku config:set EMAILJS_SERVICE_PROVIDER_DEFAULT_REPLY_TO=support@MaineDrainBusters.com
   heroku config:set EMAILJS_CLIENT_TEMPLATE_ID=your-client-template-id
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
- **Response**: JSON with EmailJS configuration parameters for both service provider and client templates

### Prepare Email Data
- **URL**: `/api/prepare-email`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-123-4567",
    "message": "I need help with my plumbing",
    "subject": "Plumbing Assistance",
    "address": "123 Main St, Portland, ME",
    "discount_claimed": "10% New Customer Discount"
  }
  ```
- **Response**: JSON with EmailJS configuration and template parameters for both email types

#### Response example:
```json
{
  "success": true,
  "emailConfigs": {
    "serviceProvider": {
      "serviceId": "service_nm8ork9",
      "templateId": "template_al86nng",
      "publicKey": "msqtzpkqSBGbI_lyv",
      "templateParams": {
        "client_name": "John Doe",
        "client_email": "john@example.com",
        "client_phone": "555-123-4567",
        "service_details": "I need help with my plumbing",
        "subject": "Plumbing Assistance",
        "address": "123 Main St, Portland, ME",
        "discount_claimed": "10% New Customer Discount"
      }
    },
    "client": {
      "serviceId": "service_nm8ork9",
      "templateId": "template_5260iiq",
      "publicKey": "msqtzpkqSBGbI_lyv",
      "templateParams": {
        "client_name": "John Doe",
        "to_email": "john@example.com",
        "subject": "Plumbing Assistance",
        "service_details": "I need help with my plumbing"
      }
    }
  }
}
```

### Health Check
- **URL**: `/api/health`
- **Method**: `GET`
- **Response**: `{"status": "healthy"}`

## Front-end Integration

To integrate with your front-end React application, use EmailJS directly on the client side to send both emails:

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
      subject: 'Service Request',
      address: e.target.address?.value,
      discount_claimed: e.target.discount?.value
    };
    
    try {
      // Get email configs from server for both emails
      const response = await fetch('https://your-backend-url.com/api/prepare-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        const { serviceProvider, client } = data.emailConfigs;
        
        // Send notification email to service provider
        await emailjs.send(
          serviceProvider.serviceId,
          serviceProvider.templateId,
          serviceProvider.templateParams,
          serviceProvider.publicKey
        );
        
        // Send confirmation email to client
        await emailjs.send(
          client.serviceId,
          client.templateId,
          client.templateParams,
          client.publicKey
        );
        
        // Show success message
        console.log('Both emails sent successfully!');
      }
      
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