const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamodb = DynamoDBDocument.from(new DynamoDB({ region: 'us-east-1' }));
const FORUM_THREADS_TABLE = process.env.FORUM_THREADS_TABLE;
const FORUM_POSTS_TABLE = process.env.FORUM_POSTS_TABLE;
const FORUM_CATEGORIES_TABLE = process.env.FORUM_CATEGORIES_TABLE;

/**
 * List threads in a category
 * GET /api/{forumId}/categories/{categoryId}/threads
 */
exports.list = async (event) => {
  try {
    const { forumId, categoryId } = event.pathParameters;
    const limit = parseInt(event.queryStringParameters?.limit || '50');

    const forumCategoryKey = `${forumId}#${categoryId}`;

    const result = await dynamodb.query({
      TableName: FORUM_THREADS_TABLE,
      IndexName: 'ForumCategoryIndex',
      KeyConditionExpression: 'forumCategoryKey = :key',
      ExpressionAttributeValues: {
        ':key': forumCategoryKey
      },
      Limit: limit,
      ScanIndexForward: false // Newest first
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
    console.error('List threads error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to list threads' })
    };
  }
};

/**
 * Create thread
 * POST /api/{forumId}/categories/{categoryId}/threads
 */
exports.create = async (event) => {
  try {
    const { forumId, categoryId } = event.pathParameters;
    const { title, content, authorId, authorName } = JSON.parse(event.body);

    if (!title || !content || !authorId || !authorName) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Verify category exists
    const categoryKey = `${forumId}#${categoryId}`;
    const category = await dynamodb.get({
      TableName: FORUM_CATEGORIES_TABLE,
      Key: { categoryKey }
    }).then(res => res.Item);

    if (!category) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Category not found' })
      };
    }

    const threadId = uuidv4();
    const threadKey = `${forumId}#${threadId}`;
    const forumCategoryKey = `${forumId}#${categoryId}`;
    const now = Date.now();

    // Create thread
    const thread = {
      threadKey,
      forumId,
      threadId,
      categoryId,
      forumCategoryKey,
      title,
      authorId,
      authorName,
      createdAt: now,
      lastActivityAt: now,
      postCount: 1,
      viewCount: 0,
      isPinned: false,
      isLocked: false
    };

    await dynamodb.put({
      TableName: FORUM_THREADS_TABLE,
      Item: thread
    });

    // Create first post (the thread content)
    const postId = uuidv4();
    const postKey = `${forumId}#${postId}`;
    const forumThreadKey = `${forumId}#${threadId}`;

    const post = {
      postKey,
      forumId,
      postId,
      threadId,
      forumThreadKey,
      authorId,
      authorName,
      content,
      createdAt: now,
      upvotes: 0,
      downvotes: 0
    };

    await dynamodb.put({
      TableName: FORUM_POSTS_TABLE,
      Item: post
    });

    // Update category thread count
    await dynamodb.update({
      TableName: FORUM_CATEGORIES_TABLE,
      Key: { categoryKey },
      UpdateExpression: 'SET threadCount = if_not_exists(threadCount, :zero) + :inc',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':zero': 0
      }
    });

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ thread, post })
    };

  } catch (error) {
    console.error('Create thread error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create thread' })
    };
  }
};

/**
 * Get single thread
 * GET /api/{forumId}/threads/{threadId}
 */
exports.get = async (event) => {
  try {
    const { forumId, threadId } = event.pathParameters;
    const threadKey = `${forumId}#${threadId}`;

    const thread = await dynamodb.get({
      TableName: FORUM_THREADS_TABLE,
      Key: { threadKey }
    }).then(res => res.Item);

    if (!thread) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Thread not found' })
      };
    }

    // Increment view count
    await dynamodb.update({
      TableName: FORUM_THREADS_TABLE,
      Key: { threadKey },
      UpdateExpression: 'SET viewCount = if_not_exists(viewCount, :zero) + :inc',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':zero': 0
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(thread)
    };

  } catch (error) {
    console.error('Get thread error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get thread' })
    };
  }
};
