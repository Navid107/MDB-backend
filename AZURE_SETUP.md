# Azure Microsoft Graph Setup

## Required Environment Variables

Add these environment variables to your `.env` file:

```env
# Azure Microsoft Graph Configuration
AZURE_CLIENT_ID=your_azure_client_id
AZURE_TENANT_ID=your_azure_tenant_id
AZURE_CLIENT_SECRET=your_azure_client_secret

# Existing variables (keep these)
WEBSITE_URL=your_website_url
SUPPORT_ACCOUNT=your_support_email@domain.com
```

## Deactivated SMTP Variables

The following SMTP variables are now deactivated (commented out in code):
- `SMTP_HOST`
- `SMTP_USER` 
- `SMTP_PASS`
- `SMTP_PORT`
- `SMTP_SECURE`

## Azure Setup Steps

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Create a new app registration or use existing one
4. Note down the Application (client) ID and Directory (tenant) ID
5. Go to "Certificates & secrets" and create a new client secret
6. Go to "API permissions" and add "Microsoft Graph" > "Mail.Send" permission
7. Grant admin consent for the permission

## Code Changes

- SMTP configuration is commented out but preserved
- New Azure Microsoft Graph authentication added
- Email sending now uses Microsoft Graph API
- All original SMTP code is deactivated but not deleted
