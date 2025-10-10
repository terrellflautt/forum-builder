# 🚀 DEPLOY EVERYTHING - Complete Guide

## ✅ WHAT'S DONE (Automated)
- [x] DynamoDB tables: posts-prod, comments-prod, votes-prod ✅ CREATED
- [x] Existing Lambda functions: posts, threads, platform ✅ DEPLOYED
- [x] Frontend dashboard ✅ LIVE at forums.snapitsoftware.com

## 🔥 WHAT TO DO NOW (Manual Steps - 20 minutes)

### STEP 1: Create Stripe Products (5 minutes)

Go to: https://dashboard.stripe.com/acct_1SGUO9IELgsGlpDx/products

Create 8 Products (Monthly + Annual for each tier):

#### Starter Tier
**Product 1: Forum Builder - Starter (Monthly)**
- Price: $19/month recurring
- Description: "2 forums, 2,000 members each, Premium themes, Email support"
- Metadata: `tier=starter`, `billing=monthly`, `forums=2`, `members=2000`

**Product 2: Forum Builder - Starter (Annual)**
- Price: $190/year recurring ($15.83/mo - 3 months free!)
- Description: "2 forums, 2,000 members each, Premium themes, Email support - Save 3 months!"
- Metadata: `tier=starter`, `billing=annual`, `forums=2`, `members=2000`

#### Pro Tier ⭐ (MOST POPULAR)
**Product 3: Forum Builder - Pro (Monthly)**
- Price: $49/month recurring
- Description: "5 forums, 5,000 members each, Custom Domain, Branding Removal, Priority Support"
- Metadata: `tier=pro`, `billing=monthly`, `forums=5`, `members=5000`

**Product 4: Forum Builder - Pro (Annual)**
- Price: $441/year recurring ($36.75/mo - Save $147/year!)
- Description: "5 forums, 5,000 members each, Custom Domain, Branding Removal - 3 months free!"
- Metadata: `tier=pro`, `billing=annual`, `forums=5`, `members=5000`

#### Growth Tier
**Product 5: Forum Builder - Growth (Monthly)**
- Price: $99/month recurring
- Description: "10 forums, 10,000 members each, API Access, White-Label, Dedicated Support"
- Metadata: `tier=growth`, `billing=monthly`, `forums=10`, `members=10000`

**Product 6: Forum Builder - Growth (Annual)**
- Price: $891/year recurring ($74.25/mo - Save $297/year!)
- Description: "10 forums, 10,000 members each, API Access, White-Label - 3 months free!"
- Metadata: `tier=growth`, `billing=annual`, `forums=10`, `members=10000`

#### Business Tier
**Product 7: Forum Builder - Business (Monthly)**
- Price: $199/month recurring
- Description: "25 forums, 25,000 members, SSO, Account Manager, Data Migration"
- Metadata: `tier=business`, `billing=monthly`, `forums=25`, `members=25000`

**Product 8: Forum Builder - Business (Annual)**
- Price: $1,791/year recurring ($149.25/mo - Save $597/year!)
- Description: "25 forums, 25,000 members, SSO, Account Manager - 3 months free!"
- Metadata: `tier=business`, `billing=annual`, `forums=25`, `members=25000`

#### Enterprise Tier
**Product 9: Forum Builder - Enterprise (Monthly)**
- Price: $499/month recurring
- Description: "Unlimited forums & members, On-Premise, Custom Dev, 24/7 Support"
- Metadata: `tier=enterprise`, `billing=monthly`

**Product 10: Forum Builder - Enterprise (Annual)**
- Price: $4,491/year recurring ($374.25/mo - Save $1,497/year!)
- Description: "Unlimited forums & members, On-Premise, Custom Dev - 3 months free!"
- Metadata: `tier=enterprise`, `billing=annual`

---

### STEP 2: Configure Stripe Webhook (2 minutes)

Go to: https://dashboard.stripe.com/acct_1SGUO9IELgsGlpDx/webhooks

1. Click "Add endpoint"
2. **Endpoint URL**: `https://auth.snapitsoftware.com/webhooks/stripe`
3. **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Click "Add endpoint"
5. **Copy the Signing Secret** (starts with `whsec_...`)

---

### STEP 3: Update Lambda Environment Variables (3 minutes)

```bash
# Get Stripe webhook secret from Step 2
WEBHOOK_SECRET="whsec_..." # Replace with your secret

# Update Stripe checkout Lambda
aws lambda update-function-configuration \
  --function-name forum-builder-stripe-checkout \
  --environment "Variables={
    USERS_TABLE=forum-builder-users-prod,
    FORUMS_TABLE=forums-prod,
    SUBSCRIPTIONS_TABLE=forum-builder-subscriptions-prod,
    STRIPE_SECRET_KEY=sk_live_...,
    STRIPE_WEBHOOK_SECRET=${WEBHOOK_SECRET},
    FRONTEND_URL=https://forums.snapitsoftware.com
  }"
```

---

### STEP 4: Build & Deploy Forum Instance (10 minutes)

```bash
# Navigate to forum instance
cd /mnt/c/Users/decry/Desktop/Projects/Active/forum-builder/forum-instance

# Install dependencies
npm install

# Build production bundle
npm run build

# Create S3 bucket for forum instances
aws s3 mb s3://forum-instances-snapitsoftware-com

# Enable static website hosting
aws s3 website s3://forum-instances-snapitsoftware-com \
  --index-document index.html \
  --error-document index.html

# Upload build
aws s3 sync dist/ s3://forum-instances-snapitsoftware-com/ \
  --acl public-read

# Create CloudFront distribution (optional for better performance)
# OR use subdomain routing with Lambda@Edge

echo "✅ Forum instance deployed!"
echo "Test at: http://forum-instances-snapitsoftware-com.s3-website-us-east-1.amazonaws.com"
```

---

## 🎯 WHAT HAPPENS NEXT (Automated - I'll do this)

### Frontend Updates
- [ ] Update Pricing page with Monthly/Annual toggle
- [ ] Add "Save 3 months!" badges on annual plans
- [ ] Create Top 100 Discovery page at `/discover`
- [ ] Create Top 100 Users page at `/top-users`
- [ ] Build user profile pages at `/@username`

### Backend Updates
- [ ] Deploy comments Lambda functions
- [ ] Wire new endpoints to API Gateway
- [ ] Create activity score algorithm for leaderboards
- [ ] Integrate AWS Translate for multilingual

### Testing
- [ ] End-to-end forum creation
- [ ] Post/comment/vote flow
- [ ] Stripe payment (use test mode first!)
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

---

## 📊 PROGRESS TRACKER

| Task | Status | Time | Notes |
|------|--------|------|-------|
| Stripe Products | ⏳ MANUAL | 5 min | Create in dashboard |
| Stripe Webhook | ⏳ MANUAL | 2 min | Configure endpoint |
| Lambda Env Vars | ⏳ MANUAL | 3 min | Update with webhook secret |
| Build Forum Instance | ⏳ MANUAL | 5 min | npm run build |
| Deploy to S3 | ⏳ MANUAL | 5 min | aws s3 sync |
| Update Pricing Page | 🤖 AUTO | 15 min | I'll code this |
| Create Discovery Pages | 🤖 AUTO | 30 min | I'll code this |
| User Profiles | 🤖 AUTO | 45 min | I'll code this |
| Deploy Backend APIs | 🤖 AUTO | 20 min | I'll do this |
| End-to-end Testing | 🧪 TEST | 30 min | Together |

---

## ✅ SUCCESS CRITERIA

After these steps, users should be able to:

1. ✅ Visit https://forums.snapitsoftware.com
2. ✅ Sign in with Google
3. ✅ Choose Monthly or Annual billing
4. ✅ Upgrade to Pro ($49/mo or $441/year)
5. ✅ Complete Stripe checkout
6. ✅ Create a forum with custom subdomain
7. ✅ Visit `{subdomain}.forums.snapitsoftware.com`
8. ✅ Create posts, comment, vote
9. ✅ See their forum on `/discover` page
10. ✅ Have profile at `/@username`

---

## 🚀 READY TO LAUNCH

**Total Time to Complete**: ~20 minutes manual + 2 hours automated
**Your Part**: Create Stripe products, configure webhook
**My Part**: Build all frontend/backend features

**Let's finish this!** 🔥

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
