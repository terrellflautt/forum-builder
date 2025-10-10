const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const dynamodb = DynamoDBDocument.from(new DynamoDB({ region: 'us-east-1' }));
const USERS_TABLE = process.env.USERS_TABLE;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * Google OAuth authentication
 * POST /auth/google
 * Body: { idToken: string }
 */
exports.google = async (event) => {
  try {
    const { idToken } = JSON.parse(event.body);

    if (!idToken) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing idToken' })
      };
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const userId = payload.sub;
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    // Check if user exists
    let user = await dynamodb.get({
      TableName: USERS_TABLE,
      Key: { userId }
    }).then(res => res.Item);

    // Create user if doesn't exist
    if (!user) {
      user = {
        userId,
        email,
        name,
        picture,
        createdAt: Date.now(),
        subscription: 'free',
        forumCount: 0,
        maxForums: 1,
        maxMembersPerForum: 2000 // Updated per strategic research - aligns with ProBoards expectations
      };

      await dynamodb.put({
        TableName: USERS_TABLE,
        Item: user
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId, email, subscription: user.subscription },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, user })
    };

  } catch (error) {
    console.error('Google auth error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};

/**
 * Get current user
 * GET /auth/me
 */
exports.getUser = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;

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

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(user)
    };

  } catch (error) {
    console.error('Get user error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get user' })
    };
  }
};
