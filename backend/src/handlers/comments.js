const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const COMMENTS_TABLE = process.env.COMMENTS_TABLE || 'comments-prod';
const POSTS_TABLE = process.env.POSTS_TABLE || 'posts-prod';
const VOTES_TABLE = process.env.VOTES_TABLE || 'votes-prod';

// Helper to get user from JWT
function getUserFromEvent(event) {
  const claims = event.requestContext.authorizer?.claims;
  if (!claims) throw new Error('Unauthorized');
  return {
    userId: claims.sub,
    email: claims.email
  };
}

/**
 * GET /posts/{postId}/comments
 * Get all comments for a post (with nested structure)
 */
exports.getComments = async (event) => {
  try {
    const { postId } = event.pathParameters;

    // Query all comments for this post
    const result = await dynamodb.query({
      TableName: COMMENTS_TABLE,
      IndexName: 'PostCommentsIndex',
      KeyConditionExpression: 'postId = :postId',
      ExpressionAttributeValues: {
        ':postId': postId
      },
      ScanIndexForward: true // oldest first
    }).promise();

    const comments = result.Items || [];

    // Build nested comment tree
    const commentTree = buildCommentTree(comments);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        comments: commentTree,
        total: comments.length
      })
    };
  } catch (error) {
    console.error('Get comments error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get comments' })
    };
  }
};

/**
 * POST /posts/{postId}/comments
 * Create a new top-level comment
 */
exports.createComment = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { postId } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Content is required' })
      };
    }

    // Verify post exists
    const postResult = await dynamodb.get({
      TableName: POSTS_TABLE,
      Key: { postId }
    }).promise();

    if (!postResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Post not found' })
      };
    }

    const comment = {
      commentId: uuidv4(),
      postId,
      authorId: user.userId,
      authorEmail: user.email,
      content: content.trim(),
      parentId: null, // Top-level comment
      depth: 0,
      voteScore: 0,
      upvotes: 0,
      downvotes: 0,
      replyCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await dynamodb.put({
      TableName: COMMENTS_TABLE,
      Item: comment
    }).promise();

    // Update post comment count
    await dynamodb.update({
      TableName: POSTS_TABLE,
      Key: { postId },
      UpdateExpression: 'SET commentCount = if_not_exists(commentCount, :zero) + :one, updatedAt = :now',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':now': Date.now()
      }
    }).promise();

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comment })
    };
  } catch (error) {
    console.error('Create comment error:', error);
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to create comment' })
    };
  }
};

/**
 * POST /comments/{commentId}/reply
 * Reply to an existing comment (nested up to 5 levels)
 */
exports.replyToComment = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { commentId } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Content is required' })
      };
    }

    // Get parent comment
    const parentResult = await dynamodb.get({
      TableName: COMMENTS_TABLE,
      Key: { commentId }
    }).promise();

    if (!parentResult.Item) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Parent comment not found' })
      };
    }

    const parentComment = parentResult.Item;

    // Check depth limit (max 5 levels: 0, 1, 2, 3, 4)
    if (parentComment.depth >= 4) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: 'Maximum nesting depth reached (5 levels)',
          maxDepth: 5
        })
      };
    }

    const reply = {
      commentId: uuidv4(),
      postId: parentComment.postId,
      authorId: user.userId,
      authorEmail: user.email,
      content: content.trim(),
      parentId: commentId,
      depth: parentComment.depth + 1,
      voteScore: 0,
      upvotes: 0,
      downvotes: 0,
      replyCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await dynamodb.put({
      TableName: COMMENTS_TABLE,
      Item: reply
    }).promise();

    // Update parent comment reply count
    await dynamodb.update({
      TableName: COMMENTS_TABLE,
      Key: { commentId },
      UpdateExpression: 'SET replyCount = if_not_exists(replyCount, :zero) + :one, updatedAt = :now',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':now': Date.now()
      }
    }).promise();

    // Update post comment count (all comments, including replies)
    await dynamodb.update({
      TableName: POSTS_TABLE,
      Key: { postId: parentComment.postId },
      UpdateExpression: 'SET commentCount = if_not_exists(commentCount, :zero) + :one, updatedAt = :now',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':one': 1,
        ':now': Date.now()
      }
    }).promise();

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ comment: reply })
    };
  } catch (error) {
    console.error('Reply to comment error:', error);
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to create reply' })
    };
  }
};

/**
 * POST /comments/{commentId}/vote
 * Upvote or downvote a comment
 */
exports.voteComment = async (event) => {
  try {
    const user = getUserFromEvent(event);
    const { commentId } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { voteType } = body; // 'up' or 'down'

    if (!['up', 'down'].includes(voteType)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Invalid vote type' })
      };
    }

    const voteId = `${user.userId}#${commentId}`;

    // Check existing vote
    const existingVote = await dynamodb.get({
      TableName: VOTES_TABLE,
      Key: { voteId }
    }).promise();

    let voteChange = 0;
    if (existingVote.Item) {
      // User already voted
      if (existingVote.Item.voteType === voteType) {
        // Same vote - remove it (unvote)
        await dynamodb.delete({
          TableName: VOTES_TABLE,
          Key: { voteId }
        }).promise();

        voteChange = voteType === 'up' ? -1 : 1;
      } else {
        // Different vote - update it
        await dynamodb.put({
          TableName: VOTES_TABLE,
          Item: {
            voteId,
            itemId: commentId,
            itemType: 'comment',
            userId: user.userId,
            voteType,
            createdAt: Date.now()
          }
        }).promise();

        voteChange = voteType === 'up' ? 2 : -2; // Flip
      }
    } else {
      // New vote
      await dynamodb.put({
        TableName: VOTES_TABLE,
        Item: {
          voteId,
          itemId: commentId,
          itemType: 'comment',
          userId: user.userId,
          voteType,
          createdAt: Date.now()
        }
      }).promise();

      voteChange = voteType === 'up' ? 1 : -1;
    }

    // Update comment vote score
    const result = await dynamodb.update({
      TableName: COMMENTS_TABLE,
      Key: { commentId },
      UpdateExpression: 'SET voteScore = voteScore + :change, updatedAt = :now',
      ExpressionAttributeValues: {
        ':change': voteChange,
        ':now': Date.now()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        voteScore: result.Attributes.voteScore,
        voteChange
      })
    };
  } catch (error) {
    console.error('Vote comment error:', error);
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to vote' })
    };
  }
};

/**
 * Helper: Build nested comment tree from flat list
 */
function buildCommentTree(comments) {
  const commentMap = new Map();
  const rootComments = [];

  // First pass: Create map and initialize replies array
  comments.forEach(comment => {
    commentMap.set(comment.commentId, {
      ...comment,
      replies: []
    });
  });

  // Second pass: Build tree structure
  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.commentId);

    if (comment.parentId === null) {
      // Top-level comment
      rootComments.push(commentWithReplies);
    } else {
      // Nested reply
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(commentWithReplies);
      }
    }
  });

  // Sort root comments by vote score (highest first)
  rootComments.sort((a, b) => b.voteScore - a.voteScore);

  // Recursively sort replies by creation time (oldest first for conversation flow)
  function sortReplies(comment) {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort((a, b) => a.createdAt - b.createdAt);
      comment.replies.forEach(sortReplies);
    }
  }

  rootComments.forEach(sortReplies);

  return rootComments;
}

module.exports = {
  getComments: exports.getComments,
  createComment: exports.createComment,
  replyToComment: exports.replyToComment,
  voteComment: exports.voteComment
};
