# Maine Drain Busters Email Server

A Node.js backend server for handling email functionality for Maine Drain Busters website.

## Features

- Email handling using EmailJS
- Environment variable configuration
- CORS enabled
- Express server
- Health check endpoint

## Setup

1. Clone the repository:
```bash
git clone [your-repo-url]
cd [repo-name]
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=3001
EMAILJS_PUBLIC_KEY=your_public_key
EMAILJS_SERVICE_ID=your_service_id
EMAILJS_TEMPLATE_ID=your_template_id
EMAILJS_DEFAULT_REPLY_TO=your_default_email
```

4. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
```

## API Endpoints

### POST /api/send-email
Sends an email using EmailJS.

Request body:
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "message": "string"
}
```

### GET /api/health
Health check endpoint.

Response:
```json
{
  "status": "ok"
}
```

## Environment Variables

- `PORT`: Server port (default: 3001)
- `EMAILJS_PUBLIC_KEY`: EmailJS public key
- `EMAILJS_SERVICE_ID`: EmailJS service ID
- `EMAILJS_TEMPLATE_ID`: EmailJS template ID
- `EMAILJS_DEFAULT_REPLY_TO`: Default reply-to email address

## License

ISC 