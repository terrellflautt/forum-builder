const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const USERS_TABLE = process.env.USERS_TABLE || 'forum-builder-users-prod';
const FORUMS_TABLE = process.env.FORUMS_TABLE || 'forums-prod';
const POSTS_TABLE = process.env.POSTS_TABLE || 'posts-prod';

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
 * GET /users/{username}
 * Get public user profile
 */
exports.getUserProfile = async (event) => {
  try {
    const { username } = event.pathParameters;

    // Find user by username or email prefix
    const result = await dynamodb.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'username = :username OR begins_with(email, :emailPrefix)',
      ExpressionAttributeValues: {
        ':username': username,
        ':emailPrefix': username
      }
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = result.Items[0];

    // Get user's forums
    const forumsResult = await dynamodb.scan({
      TableName: FORUMS_TABLE,
      FilterExpression: 'ownerId = :userId AND isPublic = :true',
      ExpressionAttributeValues: {
        ':userId': user.userId,
        ':true': true
      }
    }).promise();

    const forumCount = forumsResult.Items?.length || 0;

    // Get user's recent posts
    const postsResult = await dynamodb.scan({
      TableName: POSTS_TABLE,
      FilterExpression: 'authorId = :userId',
      ExpressionAttributeValues: {
        ':userId': user.userId
      },
      Limit: 20
    }).promise();

    let recentPosts = postsResult.Items || [];
    recentPosts = recentPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 12);

    // Calculate karma (sum of all post votes)
    const karma = recentPosts.reduce((sum, post) => sum + (post.voteScore || 0), 0);

    // Enrich posts with forum info
    recentPosts = await Promise.all(recentPosts.map(async (post) => {
      const forumResult = await dynamodb.get({
        TableName: FORUMS_TABLE,
        Key: { forumId: post.forumId }
      }).promise();

      return {
        ...post,
        forumSubdomain: forumResult.Item?.subdomain || 'unknown'
      };
    }));

    // Build public profile
    const publicProfile = {
      userId: user.userId,
      username: user.username || user.email.split('@')[0],
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio || '',
      links: user.links || [],
      karma,
      forumCount,
      postCount: recentPosts.length,
      followerCount: user.followerCount || 0,
      recentPosts,
      createdAt: user.createdAt
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user: publicProfile })
    };
  } catch (error) {
    console.error('Get user profile error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get user profile' })
    };
  }
};

/**
 * PUT /users/{username}
 * Update user profile (own profile only)
 */
exports.updateUserProfile = async (event) => {
  try {
    const authUser = getUserFromEvent(event);
    const { username } = event.pathParameters;
    const body = JSON.parse(event.body);
    const { bio, links } = body;

    // Find user by username
    const result = await dynamodb.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'username = :username OR begins_with(email, :emailPrefix)',
      ExpressionAttributeValues: {
        ':username': username,
        ':emailPrefix': username
      }
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = result.Items[0];

    // Verify ownership
    if (user.userId !== authUser.userId) {
      return {
        statusCode: 403,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Forbidden: Cannot edit another user\'s profile' })
      };
    }

    // Validate links
    if (links && Array.isArray(links)) {
      // Limit to 50 links
      if (links.length > 50) {
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Maximum 50 links allowed' })
        };
      }

      // Validate link structure
      for (const link of links) {
        if (!link.title || !link.url) {
          return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Each link must have title and url' })
          };
        }
      }
    }

    // Update profile
    const updateResult = await dynamodb.update({
      TableName: USERS_TABLE,
      Key: { userId: user.userId },
      UpdateExpression: 'SET bio = :bio, links = :links, updatedAt = :now',
      ExpressionAttributeValues: {
        ':bio': bio || '',
        ':links': links || [],
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
        user: updateResult.Attributes
      })
    };
  } catch (error) {
    console.error('Update user profile error:', error);
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to update profile' })
    };
  }
};

/**
 * POST /users/{username}/follow
 * Follow/unfollow a user
 */
exports.followUser = async (event) => {
  try {
    const authUser = getUserFromEvent(event);
    const { username } = event.pathParameters;

    // Find target user
    const result = await dynamodb.scan({
      TableName: USERS_TABLE,
      FilterExpression: 'username = :username OR begins_with(email, :emailPrefix)',
      ExpressionAttributeValues: {
        ':username': username,
        ':emailPrefix': username
      }
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const targetUser = result.Items[0];

    // Cannot follow yourself
    if (targetUser.userId === authUser.userId) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Cannot follow yourself' })
      };
    }

    // Check if already following
    const following = targetUser.followers || [];
    const isFollowing = following.includes(authUser.userId);

    let updateExpression;
    let expressionValues;

    if (isFollowing) {
      // Unfollow
      const newFollowers = following.filter(id => id !== authUser.userId);
      updateExpression = 'SET followers = :followers, followerCount = :count, updatedAt = :now';
      expressionValues = {
        ':followers': newFollowers,
        ':count': newFollowers.length,
        ':now': Date.now()
      };
    } else {
      // Follow
      const newFollowers = [...following, authUser.userId];
      updateExpression = 'SET followers = :followers, followerCount = :count, updatedAt = :now';
      expressionValues = {
        ':followers': newFollowers,
        ':count': newFollowers.length,
        ':now': Date.now()
      };
    }

    await dynamodb.update({
      TableName: USERS_TABLE,
      Key: { userId: targetUser.userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionValues
    }).promise();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        following: !isFollowing,
        followerCount: isFollowing ? following.length - 1 : following.length + 1
      })
    };
  } catch (error) {
    console.error('Follow user error:', error);
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message || 'Failed to follow user' })
    };
  }
};

module.exports = {
  getUserProfile: exports.getUserProfile,
  updateUserProfile: exports.updateUserProfile,
  followUser: exports.followUser
};
