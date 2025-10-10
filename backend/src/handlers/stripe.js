const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const Stripe = require('stripe');

const dynamodb = DynamoDBDocument.from(new DynamoDB({ region: 'us-east-1' }));
const USERS_TABLE = process.env.USERS_TABLE;
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Pricing configuration
const PRICING = {
  pro: {
    priceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    name: 'Pro',
    maxForums: 3,
    maxMembersPerForum: 5000,
    price: 1900 // $19.00 in cents
  },
  business: {
    priceId: 'price_business_monthly', // Replace with actual Stripe price ID
    name: 'Business',
    maxForums: 10,
    maxMembersPerForum: 25000,
    price: 4900 // $49.00 in cents
  },
  enterprise: {
    priceId: 'price_enterprise_monthly', // Replace with actual Stripe price ID
    name: 'Enterprise',
    maxForums: -1, // Unlimited
    maxMembersPerForum: -1, // Unlimited
    price: 14900 // $149.00 in cents
  }
};

/**
 * Create Stripe checkout session
 * POST /subscribe
 */
exports.createCheckout = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    const email = event.requestContext.authorizer.email;
    const { tier } = JSON.parse(event.body);

    if (!tier || !PRICING[tier]) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid tier' })
      };
    }

    // Get user
    const user = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).then(res => res.Item);

    if (!user) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Check if user already has a subscription
    if (user.subscription !== 'free') {
      return {
        statusCode: 409,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Already subscribed',
          code: 'ALREADY_SUBSCRIBED'
        })
      };
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
          forumBuilder: 'true'
        }
      });
      customerId = customer.id;

      // Update user with customer ID
      await dynamodb.update({
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET stripeCustomerId = :customerId',
        ExpressionAttributeValues: {
          ':customerId': customerId
        }
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: PRICING[tier].priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'https://forums.snapitsoftware.com'}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://forums.snapitsoftware.com'}/pricing?canceled=true`,
      metadata: {
        userId,
        tier
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: session.id,
        url: session.url
      })
    };

  } catch (error) {
    console.error('Create checkout error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create checkout session' })
    };
  }
};

/**
 * Stripe webhook handler
 * POST /webhooks/stripe
 */
exports.webhook = async (event) => {
  try {
    const sig = event.headers['Stripe-Signature'] || event.headers['stripe-signature'];

    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Webhook signature verification failed' })
      };
    }

    // Handle the event
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook handler failed' })
    };
  }
};

/**
 * Get user's subscription
 * GET /subscription
 */
exports.getSubscription = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;

    const subscription = await dynamodb.get({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: { userId }
    }).then(res => res.Item);

    const user = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).then(res => res.Item);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tier: user?.subscription || 'free',
        status: subscription?.status || 'active',
        currentPeriodEnd: subscription?.currentPeriodEnd,
        maxForums: user?.maxForums || 1,
        forumCount: user?.forumCount || 0,
        maxMembersPerForum: user?.maxMembersPerForum || 500
      })
    };

  } catch (error) {
    console.error('Get subscription error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get subscription' })
    };
  }
};

/**
 * Cancel subscription
 * POST /subscription/cancel
 */
exports.cancel = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;

    const user = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).then(res => res.Item);

    if (!user?.stripeSubscriptionId) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No active subscription' })
      };
    }

    // Cancel at period end (don't immediately revoke access)
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Subscription will be canceled at period end'
      })
    };

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to cancel subscription' })
    };
  }
};

// Helper functions

async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const tier = session.metadata.tier;
  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Update user with subscription info
  await dynamodb.update({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET subscription = :tier, stripeCustomerId = :customerId, stripeSubscriptionId = :subId, maxForums = :maxForums, maxMembersPerForum = :maxMembers',
    ExpressionAttributeValues: {
      ':tier': tier,
      ':customerId': customerId,
      ':subId': subscriptionId,
      ':maxForums': PRICING[tier].maxForums,
      ':maxMembers': PRICING[tier].maxMembersPerForum
    }
  });

  // Create subscription record
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await dynamodb.put({
    TableName: SUBSCRIPTIONS_TABLE,
    Item: {
      userId,
      tier,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end * 1000,
      createdAt: Date.now()
    }
  });

  console.log(`Subscription activated for user ${userId}: ${tier}`);
}

async function handleSubscriptionUpdated(subscription) {
  const customerId = subscription.customer;

  // Find user by customer ID
  // Note: This requires a GSI on stripeCustomerId
  const users = await dynamodb.query({
    TableName: USERS_TABLE,
    IndexName: 'StripeCustomerIndex',
    KeyConditionExpression: 'stripeCustomerId = :customerId',
    ExpressionAttributeValues: {
      ':customerId': customerId
    }
  });

  if (users.Items && users.Items.length > 0) {
    const user = users.Items[0];

    await dynamodb.update({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: { userId: user.userId },
      UpdateExpression: 'SET #status = :status, currentPeriodEnd = :periodEnd',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': subscription.status,
        ':periodEnd': subscription.current_period_end * 1000
      }
    });
  }
}

async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;

  const users = await dynamodb.query({
    TableName: USERS_TABLE,
    IndexName: 'StripeCustomerIndex',
    KeyConditionExpression: 'stripeCustomerId = :customerId',
    ExpressionAttributeValues: {
      ':customerId': customerId
    }
  });

  if (users.Items && users.Items.length > 0) {
    const user = users.Items[0];

    // Downgrade to free tier
    await dynamodb.update({
      TableName: USERS_TABLE,
      Key: { userId: user.userId },
      UpdateExpression: 'SET subscription = :free, maxForums = :maxForums, maxMembersPerForum = :maxMembers',
      ExpressionAttributeValues: {
        ':free': 'free',
        ':maxForums': 1,
        ':maxMembers': 500
      }
    });

    await dynamodb.update({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: { userId: user.userId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'canceled'
      }
    });

    console.log(`Subscription canceled for user ${user.userId}`);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded:', invoice.id);
  // Could send email confirmation here
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed:', invoice.id);
  const customerId = invoice.customer;

  const users = await dynamodb.query({
    TableName: USERS_TABLE,
    IndexName: 'StripeCustomerIndex',
    KeyConditionExpression: 'stripeCustomerId = :customerId',
    ExpressionAttributeValues: {
      ':customerId': customerId
    }
  });

  if (users.Items && users.Items.length > 0) {
    const user = users.Items[0];

    // Mark subscription as past_due
    await dynamodb.update({
      TableName: SUBSCRIPTIONS_TABLE,
      Key: { userId: user.userId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'past_due'
      }
    });

    // Could send email notification here
    console.log(`Payment failed for user ${user.userId}`);
  }
}
