# Forum Builder SaaS

Multi-tenant forum builder platform inspired by Proboards.

## Overview

Forums.snapitsoftware.com allows users to create and manage their own forums with:
- Free tier (up to 500 users)
- Premium tiers with Stripe subscriptions
- Custom subdomains for each forum
- Customizable themes and branding
- Full forum management dashboard

## Tech Stack

- **Frontend**: React + Tailwind CSS
- **Backend**: AWS Lambda + API Gateway (Serverless)
- **Database**: DynamoDB (multi-tenant)
- **Auth**: Google OAuth
- **Payments**: Stripe
- **Hosting**: S3 + CloudFront
- **CDN**: CloudFront with Lambda@Edge for subdomain routing

## Project Structure

```
forum-builder/
├── frontend/           # React dashboard for forum creators
├── backend/            # Serverless API for forum management
├── forum-template/     # The actual forum interface users see
└── shared/            # Shared types and utilities
```

## Pricing

- **Free**: 1 forum, 500 members, basic themes
- **Pro** ($19/mo): 3 forums, 5K members, premium themes, custom CSS
- **Business** ($49/mo): 10 forums, 25K members, custom domain, white-label
- **Enterprise** ($149/mo): Unlimited forums, unlimited members, SSO, API

## Development

Coming soon...

## License

Proprietary - SnapIT Software
