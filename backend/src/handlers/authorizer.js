const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * JWT Authorizer for API Gateway
 */
exports.handler = async (event) => {
  try {
    const token = event.authorizationToken?.replace('Bearer ', '');

    if (!token) {
      throw new Error('No token provided');
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // Generate policy
    return {
      principalId: decoded.userId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        userId: decoded.userId,
        email: decoded.email,
        subscription: decoded.subscription
      }
    };

  } catch (error) {
    console.error('Authorization error:', error);
    throw new Error('Unauthorized');
  }
};
