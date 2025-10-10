const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamodb = DynamoDBDocument.from(new DynamoDB({ region: 'us-east-1' }));
const FORUM_CATEGORIES_TABLE = process.env.FORUM_CATEGORIES_TABLE;
const FORUMS_TABLE = process.env.FORUMS_TABLE;

/**
 * List categories in a forum
 * GET /api/{forumId}/categories
 */
exports.list = async (event) => {
  try {
    const { forumId } = event.pathParameters;

    // Verify forum exists
    const forum = await dynamodb.get({
      TableName: FORUMS_TABLE,
      Key: { forumId }
    }).then(res => res.Item);

    if (!forum || forum.status === 'deleted') {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Forum not found' })
      };
    }

    const result = await dynamodb.query({
      TableName: FORUM_CATEGORIES_TABLE,
      IndexName: 'ForumIdIndex',
      KeyConditionExpression: 'forumId = :forumId',
      ExpressionAttributeValues: {
        ':forumId': forumId
      }
    });

    // Sort by position
    const categories = (result.Items || []).sort((a, b) => a.position - b.position);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(categories)
    };

  } catch (error) {
    console.error('List categories error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to list categories' })
    };
  }
};

/**
 * Create category
 * POST /api/{forumId}/categories
 * Requires forum admin authentication
 */
exports.create = async (event) => {
  try {
    const { forumId } = event.pathParameters;
    const { name, description, emoji } = JSON.parse(event.body);

    if (!name) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing category name' })
      };
    }

    // Verify forum exists
    const forum = await dynamodb.get({
      TableName: FORUMS_TABLE,
      Key: { forumId }
    }).then(res => res.Item);

    if (!forum || forum.status === 'deleted') {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Forum not found' })
      };
    }

    // TODO: Verify user is forum owner or admin
    // This would require authentication context from the request

    const categoryId = uuidv4();
    const categoryKey = `${forumId}#${categoryId}`;

    // Get current category count for position
    const existingCategories = await dynamodb.query({
      TableName: FORUM_CATEGORIES_TABLE,
      IndexName: 'ForumIdIndex',
      KeyConditionExpression: 'forumId = :forumId',
      ExpressionAttributeValues: {
        ':forumId': forumId
      }
    });

    const position = (existingCategories.Items || []).length;

    const category = {
      categoryKey,
      forumId,
      categoryId,
      name,
      description: description || '',
      emoji: emoji || '📁',
      position,
      threadCount: 0,
      createdAt: Date.now()
    };

    await dynamodb.put({
      TableName: FORUM_CATEGORIES_TABLE,
      Item: category
    });

    // Update forum category count
    await dynamodb.update({
      TableName: FORUMS_TABLE,
      Key: { forumId },
      UpdateExpression: 'SET categoryCount = categoryCount + :inc',
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
      body: JSON.stringify(category)
    };

  } catch (error) {
    console.error('Create category error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create category' })
    };
  }
};
