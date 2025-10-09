const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamodb = DynamoDBDocument.from(new DynamoDB({ region: 'us-east-1' }));
const FORUMS_TABLE = process.env.FORUMS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

/**
 * List user's forums
 * GET /forums
 */
exports.list = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;

    const result = await dynamodb.query({
      TableName: FORUMS_TABLE,
      IndexName: 'OwnerIdIndex',
      KeyConditionExpression: 'ownerId = :ownerId',
      ExpressionAttributeValues: {
        ':ownerId': userId
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(result.Items || [])
    };

  } catch (error) {
    console.error('List forums error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to list forums' })
    };
  }
};

/**
 * Create new forum
 * POST /forums
 */
exports.create = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    const { name, subdomain, description } = JSON.parse(event.body);

    if (!name || !subdomain) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing name or subdomain' })
      };
    }

    // Validate subdomain format (alphanumeric, hyphens only)
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.' })
      };
    }

    // Check if subdomain is already taken
    const existingForum = await dynamodb.query({
      TableName: FORUMS_TABLE,
      IndexName: 'SubdomainIndex',
      KeyConditionExpression: 'subdomain = :subdomain',
      ExpressionAttributeValues: {
        ':subdomain': subdomain
      }
    });

    if (existingForum.Items && existingForum.Items.length > 0) {
      return {
        statusCode: 409,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Subdomain already taken' })
      };
    }

    // Get user to check forum limit
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

    // Check forum limit based on subscription
    if (user.forumCount >= user.maxForums) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Forum limit reached',
          code: 'FORUM_LIMIT_REACHED',
          maxForums: user.maxForums,
          currentCount: user.forumCount
        })
      };
    }

    // Create forum
    const forumId = uuidv4();
    const now = Date.now();

    const forum = {
      forumId,
      ownerId: userId,
      subdomain,
      name,
      description: description || '',
      theme: 'default',
      customCSS: '',
      customDomain: null,
      brandingEnabled: true,
      memberLimit: user.maxMembersPerForum,
      currentMemberCount: 0,
      categoryCount: 0,
      status: 'active',
      createdAt: now,
      settings: {
        allowRegistration: true,
        moderationEnabled: false,
        emailNotifications: true
      }
    };

    await dynamodb.put({
      TableName: FORUMS_TABLE,
      Item: forum
    });

    // Update user's forum count
    await dynamodb.update({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET forumCount = forumCount + :inc',
      ExpressionAttributeValues: {
        ':inc': 1
      }
    });

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(forum)
    };

  } catch (error) {
    console.error('Create forum error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create forum' })
    };
  }
};

/**
 * Get forum details
 * GET /forums/{forumId}
 */
exports.get = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    const { forumId } = event.pathParameters;

    const forum = await dynamodb.get({
      TableName: FORUMS_TABLE,
      Key: { forumId }
    }).then(res => res.Item);

    if (!forum) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Forum not found' })
      };
    }

    // Check ownership
    if (forum.ownerId !== userId) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Access denied' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(forum)
    };

  } catch (error) {
    console.error('Get forum error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get forum' })
    };
  }
};

/**
 * Update forum
 * PUT /forums/{forumId}
 */
exports.update = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    const subscription = event.requestContext.authorizer.subscription;
    const { forumId } = event.pathParameters;
    const updates = JSON.parse(event.body);

    // Get forum
    const forum = await dynamodb.get({
      TableName: FORUMS_TABLE,
      Key: { forumId }
    }).then(res => res.Item);

    if (!forum) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Forum not found' })
      };
    }

    // Check ownership
    if (forum.ownerId !== userId) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Access denied' })
      };
    }

    // Build update expression
    const allowedFields = ['name', 'description', 'theme', 'settings'];
    const premiumFields = ['customCSS', 'customDomain'];

    let updateExpression = 'SET updatedAt = :now';
    const expressionAttributeValues = { ':now': Date.now() };

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateExpression += `, ${key} = :${key}`;
        expressionAttributeValues[`:${key}`] = updates[key];
      } else if (premiumFields.includes(key)) {
        // Premium features check
        if (subscription === 'free') {
          return {
            statusCode: 403,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
              error: 'Premium feature',
              code: 'PREMIUM_FEATURE_REQUIRED',
              field: key
            })
          };
        }
        updateExpression += `, ${key} = :${key}`;
        expressionAttributeValues[`:${key}`] = updates[key];
      }
    });

    // Update forum
    await dynamodb.update({
      TableName: FORUMS_TABLE,
      Key: { forumId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    // Get updated forum
    const updatedForum = await dynamodb.get({
      TableName: FORUMS_TABLE,
      Key: { forumId }
    }).then(res => res.Item);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedForum)
    };

  } catch (error) {
    console.error('Update forum error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to update forum' })
    };
  }
};

/**
 * Delete forum
 * DELETE /forums/{forumId}
 */
exports.deleteForum = async (event) => {
  try {
    const userId = event.requestContext.authorizer.userId;
    const { forumId } = event.pathParameters;

    // Get forum
    const forum = await dynamodb.get({
      TableName: FORUMS_TABLE,
      Key: { forumId }
    }).then(res => res.Item);

    if (!forum) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Forum not found' })
      };
    }

    // Check ownership
    if (forum.ownerId !== userId) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Access denied' })
      };
    }

    // Soft delete (mark as deleted)
    await dynamodb.update({
      TableName: FORUMS_TABLE,
      Key: { forumId },
      UpdateExpression: 'SET #status = :status, deletedAt = :now',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'deleted',
        ':now': Date.now()
      }
    });

    // Update user's forum count
    await dynamodb.update({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET forumCount = forumCount - :dec',
      ExpressionAttributeValues: {
        ':dec': 1
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Forum deleted successfully' })
    };

  } catch (error) {
    console.error('Delete forum error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to delete forum' })
    };
  }
};
