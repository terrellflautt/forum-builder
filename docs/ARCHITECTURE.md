# Forum Builder Architecture

## System Overview

The Forum Builder SaaS is a multi-tenant platform that allows users to create and manage their own forums, similar to Proboards.

## Components

### 1. Main Platform (forums.snapitsoftware.com)

The dashboard where forum owners:
- Sign up with Google OAuth
- Create and manage forums
- Configure settings and themes
- Manage subscriptions
- View analytics

### 2. Forum Instances ({subdomain}.forums.snapitsoftware.com)

Individual forum sites created by users:
- Public-facing forum interface
- Member registration and authentication
- Categories, threads, and posts
- Customizable themes and branding

## Database Schema (DynamoDB)

### Table: forum-builder-users-prod
- **PK**: `userId` (Google OAuth sub)
- **Attributes**:
  - email
  - name
  - picture
  - createdAt
  - subscription (free | pro | business | enterprise)
  - stripeCustomerId
  - stripeSubscriptionId

### Table: forums-prod
- **PK**: `forumId` (UUID)
- **GSI**: ownerId-index
- **Attributes**:
  - ownerId (userId who created it)
  - subdomain (unique)
  - name
  - description
  - theme (preset theme name)
  - customCSS (premium feature)
  - customDomain (premium feature)
  - brandingEnabled (false for premium)
  - memberLimit (500 for free, higher for paid)
  - currentMemberCount
  - status (active | suspended | deleted)
  - createdAt
  - settings (JSON)

### Table: forum-members-prod
- **PK**: `forumId#memberId`
- **GSI**: forumId-index, email-index
- **Attributes**:
  - forumId
  - memberId (UUID)
  - email
  - name
  - picture
  - role (admin | moderator | member)
  - joinedAt
  - lastActive
  - isBanned
  - canPost

### Table: forum-categories-prod
- **PK**: `forumId#categoryId`
- **GSI**: forumId-index
- **Attributes**:
  - forumId
  - categoryId (UUID)
  - name
  - description
  - emoji
  - position
  - threadCount

### Table: forum-threads-prod
- **PK**: `forumId#threadId`
- **GSI**: forumId-categoryId-index
- **Attributes**:
  - forumId
  - threadId (UUID)
  - categoryId
  - title
  - authorId
  - authorName
  - createdAt
  - lastActivityAt
  - postCount
  - viewCount
  - isPinned
  - isLocked

### Table: forum-posts-prod
- **PK**: `forumId#postId`
- **GSI**: forumId-threadId-index
- **Attributes**:
  - forumId
  - postId (UUID)
  - threadId
  - authorId
  - authorName
  - content
  - createdAt
  - upvotes
  - downvotes

### Table: subscriptions-prod
- **PK**: `userId`
- **Attributes**:
  - userId
  - tier (free | pro | business | enterprise)
  - stripeCustomerId
  - stripeSubscriptionId
  - status (active | canceled | past_due)
  - currentPeriodEnd
  - forumCount
  - totalMemberLimit

## API Endpoints

### Platform API (API Gateway)

**Auth:**
- POST /auth/google - Google OAuth callback
- GET /auth/me - Get current user

**Forums Management:**
- GET /forums - List user's forums
- POST /forums - Create new forum
- GET /forums/{forumId} - Get forum details
- PUT /forums/{forumId} - Update forum settings
- DELETE /forums/{forumId} - Delete forum

**Subscription:**
- POST /subscribe - Create Stripe checkout session
- POST /webhooks/stripe - Stripe webhook handler
- GET /subscription - Get current subscription
- POST /subscription/cancel - Cancel subscription

### Forum Instance API

**Categories:**
- GET /api/{forumId}/categories - List categories
- POST /api/{forumId}/categories - Create category (admin only)
- PUT /api/{forumId}/categories/{categoryId} - Update category
- DELETE /api/{forumId}/categories/{categoryId} - Delete category

**Threads:**
- GET /api/{forumId}/categories/{categoryId}/threads - List threads
- POST /api/{forumId}/categories/{categoryId}/threads - Create thread
- GET /api/{forumId}/threads/{threadId} - Get thread
- DELETE /api/{forumId}/threads/{threadId} - Delete thread (admin/mod)

**Posts:**
- GET /api/{forumId}/threads/{threadId}/posts - List posts
- POST /api/{forumId}/threads/{threadId}/posts - Create post
- PUT /api/{forumId}/posts/{postId}/vote - Vote on post
- DELETE /api/{forumId}/posts/{postId} - Delete post

**Members:**
- POST /api/{forumId}/members/register - Register as member
- GET /api/{forumId}/members - List members (admin only)
- PUT /api/{forumId}/members/{memberId}/ban - Ban member (admin/mod)

## Subdomain Routing

### Option 1: CloudFront + Lambda@Edge
- Single CloudFront distribution
- Lambda@Edge function checks subdomain
- Routes to appropriate S3 path or API

### Option 2: API Gateway Custom Domains
- Custom domain mapping for each forum
- Wildcard cert (*.forums.snapitsoftware.com)
- API Gateway handles routing

## Stripe Integration

**Products:**
1. Pro Plan - $19/month
2. Business Plan - $49/month
3. Enterprise Plan - $149/month

**Webhook Events:**
- `checkout.session.completed` - Activate subscription
- `invoice.payment_succeeded` - Renew subscription
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_failed` - Suspend forums

## Features by Tier

| Feature | Free | Pro | Business | Enterprise |
|---------|------|-----|----------|------------|
| Forums | 1 | 3 | 10 | Unlimited |
| Members per forum | 500 | 5,000 | 25,000 | Unlimited |
| Categories | 10 | Unlimited | Unlimited | Unlimited |
| Basic themes | ✓ | ✓ | ✓ | ✓ |
| Premium themes | ✗ | ✓ | ✓ | ✓ |
| Custom CSS | ✗ | ✓ | ✓ | ✓ |
| Custom JS | ✗ | ✗ | ✓ | ✓ |
| Custom domain | ✗ | ✗ | ✓ | ✓ |
| Remove branding | ✗ | ✓ | ✓ | ✓ |
| API access | ✗ | ✗ | ✓ | ✓ |
| Analytics | Basic | Basic | Advanced | Advanced |
| Support | Community | Email | Priority | 24/7 Phone |

## Security

- Google OAuth for platform users
- JWT tokens for API authentication
- Forum members have separate auth (email-based or Google)
- Rate limiting on API endpoints
- CORS configured per forum
- XSS protection on user content
- SQL injection not applicable (NoSQL)

## Deployment

- Frontend: S3 + CloudFront
- Backend: Serverless Framework
- Region: us-east-1
- Environment variables from SSM Parameter Store
- Secrets from AWS Secrets Manager

## Monitoring

- CloudWatch Logs for Lambda functions
- CloudWatch Metrics for API Gateway
- Stripe webhook monitoring
- Forum usage metrics per tenant
- Alert on subscription failures
