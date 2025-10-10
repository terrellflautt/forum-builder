const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const FORUMS_TABLE = process.env.FORUMS_TABLE || 'forums-prod';
const USERS_TABLE = process.env.USERS_TABLE || 'forum-builder-users-prod';
const POSTS_TABLE = process.env.POSTS_TABLE || 'posts-prod';

/**
 * GET /discover/forums
 * Get top 100 public forums
 * Query params: sort (activity|members|posts|newest), limit (default 100)
 */
exports.getTopForums = async (event) => {
  try {
    const sortBy = event.queryStringParameters?.sort || 'activity';
    const limit = parseInt(event.queryStringParameters?.limit || '100', 10);

    // Scan all public forums
    const result = await dynamodb.scan({
      TableName: FORUMS_TABLE,
      FilterExpression: 'isPublic = :true',
      ExpressionAttributeValues: {
        ':true': true
      }
    }).promise();

    let forums = result.Items || [];

    // Calculate activity score for each forum
    forums = await Promise.all(forums.map(async (forum) => {
      const activityScore = calculateForumActivityScore(forum);
      return {
        ...forum,
        activityScore
      };
    }));

    // Sort based on criteria
    forums = sortForums(forums, sortBy);

    // Limit results
    forums = forums.slice(0, limit);

    // Remove sensitive data
    forums = forums.map(forum => ({
      forumId: forum.forumId,
      name: forum.name,
      subdomain: forum.subdomain,
      description: forum.description,
      isPublic: forum.isPublic,
      memberCount: forum.memberCount || 0,
      postCount: forum.postCount || 0,
      activityScore: forum.activityScore || 0,
      createdAt: forum.createdAt
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: forums,
        total: forums.length,
        sortedBy: sortBy
      })
    };
  } catch (error) {
    console.error('Get top forums error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get top forums' })
    };
  }
};

/**
 * GET /discover/users
 * Get top 100 users
 * Query params: sort (karma|forums|activity|newest), limit (default 100)
 */
exports.getTopUsers = async (event) => {
  try {
    const sortBy = event.queryStringParameters?.sort || 'karma';
    const limit = parseInt(event.queryStringParameters?.limit || '100', 10);

    // Scan all users
    const result = await dynamodb.scan({
      TableName: USERS_TABLE
    }).promise();

    let users = result.Items || [];

    // Calculate stats for each user
    users = await Promise.all(users.map(async (user) => {
      // Count forums owned by user
      const forumsResult = await dynamodb.scan({
        TableName: FORUMS_TABLE,
        FilterExpression: 'ownerId = :userId',
        ExpressionAttributeValues: {
          ':userId': user.userId
        }
      }).promise();

      const forumCount = forumsResult.Items?.length || 0;

      // Count posts by user (across all forums)
      const postsResult = await dynamodb.scan({
        TableName: POSTS_TABLE,
        FilterExpression: 'authorId = :userId',
        ExpressionAttributeValues: {
          ':userId': user.userId
        }
      }).promise();

      const postCount = postsResult.Items?.length || 0;

      // Calculate total karma from posts
      const karma = postsResult.Items?.reduce((sum, post) => sum + (post.voteScore || 0), 0) || 0;

      return {
        ...user,
        forumCount,
        postCount,
        karma
      };
    }));

    // Sort based on criteria
    users = sortUsers(users, sortBy);

    // Limit results
    users = users.slice(0, limit);

    // Remove sensitive data
    users = users.map(user => ({
      userId: user.userId,
      email: user.email,
      username: user.username,
      profilePicture: user.profilePicture,
      forumCount: user.forumCount || 0,
      postCount: user.postCount || 0,
      karma: user.karma || 0,
      createdAt: user.createdAt
    }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: users,
        total: users.length,
        sortedBy: sortBy
      })
    };
  } catch (error) {
    console.error('Get top users error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get top users' })
    };
  }
};

/**
 * GET /discover/topics
 * Get trending topics/hashtags
 * Query params: sort (trending|posts|engagement), limit (default 100)
 */
exports.getTopTopics = async (event) => {
  try {
    const sortBy = event.queryStringParameters?.sort || 'trending';
    const limit = parseInt(event.queryStringParameters?.limit || '100', 10);

    // Scan all posts to extract topics/hashtags
    const result = await dynamodb.scan({
      TableName: POSTS_TABLE
    }).promise();

    const posts = result.Items || [];

    // Extract and count topics
    const topicMap = new Map();

    posts.forEach(post => {
      // Extract hashtags from title and content
      const text = `${post.title || ''} ${post.content || ''}`;
      const hashtags = text.match(/#[\w\u0080-\uFFFF]+/g) || [];

      hashtags.forEach(tag => {
        const topic = tag.slice(1).toLowerCase(); // Remove # and lowercase
        if (!topicMap.has(topic)) {
          topicMap.set(topic, {
            name: topic,
            postCount: 0,
            engagement: 0,
            forumCount: 0,
            forums: new Set(),
            recentPosts: []
          });
        }

        const topicData = topicMap.get(topic);
        topicData.postCount++;
        topicData.engagement += (post.voteScore || 0) + (post.commentCount || 0);
        topicData.forums.add(post.forumId);
        topicData.recentPosts.push(post.createdAt);
      });
    });

    // Convert to array and calculate trending score
    let topics = Array.from(topicMap.values()).map(topic => ({
      ...topic,
      forumCount: topic.forums.size,
      trending: calculateTrendingScore(topic.recentPosts, topic.engagement)
    }));

    // Remove internal data
    topics = topics.map(({ forums, recentPosts, ...topic }) => topic);

    // Sort based on criteria
    topics = sortTopics(topics, sortBy);

    // Limit results
    topics = topics.slice(0, limit);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: topics,
        total: topics.length,
        sortedBy: sortBy
      })
    };
  } catch (error) {
    console.error('Get top topics error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to get top topics' })
    };
  }
};

/**
 * Helper: Calculate forum activity score
 * Considers: post frequency, member count, engagement
 */
function calculateForumActivityScore(forum) {
  const now = Date.now();
  const ageInDays = (now - (forum.createdAt || now)) / (1000 * 60 * 60 * 24);
  const memberCount = forum.memberCount || 0;
  const postCount = forum.postCount || 0;

  // Posts per day
  const postsPerDay = ageInDays > 0 ? postCount / ageInDays : postCount;

  // Activity score formula
  const score = (postsPerDay * 100) + (memberCount * 10);

  return Math.round(score);
}

/**
 * Helper: Calculate trending score for topics
 * Weighs recent activity higher
 */
function calculateTrendingScore(recentPosts, engagement) {
  const now = Date.now();
  const oneDay = 1000 * 60 * 60 * 24;

  // Count posts in last 24h, 7d, 30d
  const postsLast24h = recentPosts.filter(ts => now - ts < oneDay).length;
  const postsLast7d = recentPosts.filter(ts => now - ts < oneDay * 7).length;
  const postsLast30d = recentPosts.filter(ts => now - ts < oneDay * 30).length;

  // Trending score: recent activity weighted higher
  const score = (postsLast24h * 100) + (postsLast7d * 10) + postsLast30d + (engagement * 0.1);

  return Math.round(score);
}

/**
 * Helper: Sort forums by criteria
 */
function sortForums(forums, sortBy) {
  switch (sortBy) {
    case 'members':
      return forums.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    case 'posts':
      return forums.sort((a, b) => (b.postCount || 0) - (a.postCount || 0));
    case 'newest':
      return forums.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'activity':
    default:
      return forums.sort((a, b) => (b.activityScore || 0) - (a.activityScore || 0));
  }
}

/**
 * Helper: Sort users by criteria
 */
function sortUsers(users, sortBy) {
  switch (sortBy) {
    case 'forums':
      return users.sort((a, b) => (b.forumCount || 0) - (a.forumCount || 0));
    case 'activity':
      return users.sort((a, b) => (b.postCount || 0) - (a.postCount || 0));
    case 'newest':
      return users.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'karma':
    default:
      return users.sort((a, b) => (b.karma || 0) - (a.karma || 0));
  }
}

/**
 * Helper: Sort topics by criteria
 */
function sortTopics(topics, sortBy) {
  switch (sortBy) {
    case 'posts':
      return topics.sort((a, b) => (b.postCount || 0) - (a.postCount || 0));
    case 'engagement':
      return topics.sort((a, b) => (b.engagement || 0) - (a.engagement || 0));
    case 'trending':
    default:
      return topics.sort((a, b) => (b.trending || 0) - (a.trending || 0));
  }
}

module.exports = {
  getTopForums: exports.getTopForums,
  getTopUsers: exports.getTopUsers,
  getTopTopics: exports.getTopTopics
};
