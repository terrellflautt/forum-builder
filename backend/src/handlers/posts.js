const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');

const dynamodb = DynamoDBDocument.from(new DynamoDB({ region: 'us-east-1' }));
const FORUM_POSTS_TABLE = process.env.FORUM_POSTS_TABLE;
const FORUM_THREADS_TABLE = process.env.FORUM_THREADS_TABLE;

/**
 * List posts in a thread
 * GET /api/{forumId}/threads/{threadId}/posts
 */
exports.list = async (event) => {
  try {
    const { forumId, threadId } = event.pathParameters;
    const forumThreadKey = `${forumId}#${threadId}`;

    const result = await dynamodb.query({
      TableName: FORUM_POSTS_TABLE,
      IndexName: 'ForumThreadIndex',
      KeyConditionExpression: 'forumThreadKey = :key',
      ExpressionAttributeValues: {
        ':key': forumThreadKey
      },
      ScanIndexForward: true // Oldest first (chronological)
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
    console.error('List posts error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to list posts' })
    };
  }
};

/**
 * Create post
 * POST /api/{forumId}/threads/{threadId}/posts
 */
exports.create = async (event) => {
  try {
    const { forumId, threadId } = event.pathParameters;
    const { content, authorId, authorName } = JSON.parse(event.body);

    if (!content || !authorId || !authorName) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Verify thread exists and is not locked
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

    if (thread.isLocked) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Thread is locked' })
      };
    }

    const postId = uuidv4();
    const postKey = `${forumId}#${postId}`;
    const forumThreadKey = `${forumId}#${threadId}`;
    const now = Date.now();

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

    // Update thread post count and last activity
    await dynamodb.update({
      TableName: FORUM_THREADS_TABLE,
      Key: { threadKey },
      UpdateExpression: 'SET postCount = postCount + :inc, lastActivityAt = :now',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':now': now
      }
    });

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(post)
    };

  } catch (error) {
    console.error('Create post error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to create post' })
    };
  }
};

/**
 * Vote on post
 * PUT /api/{forumId}/posts/{postId}/vote
 */
exports.vote = async (event) => {
  try {
    const { forumId, postId } = event.pathParameters;
    const { vote } = JSON.parse(event.body); // 'up' or 'down'

    if (!vote || !['up', 'down'].includes(vote)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid vote. Must be "up" or "down"' })
      };
    }

    const postKey = `${forumId}#${postId}`;

    // Increment the appropriate vote counter
    const updateExpression = vote === 'up'
      ? 'SET upvotes = if_not_exists(upvotes, :zero) + :inc'
      : 'SET downvotes = if_not_exists(downvotes, :zero) + :inc';

    const result = await dynamodb.update({
      TableName: FORUM_POSTS_TABLE,
      Key: { postKey },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: {
        ':inc': 1,
        ':zero': 0
      },
      ReturnValues: 'ALL_NEW'
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        upvotes: result.Attributes.upvotes,
        downvotes: result.Attributes.downvotes
      })
    };

  } catch (error) {
    console.error('Vote post error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to vote on post' })
    };
  }
};
