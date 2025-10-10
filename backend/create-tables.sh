#!/bin/bash
# Create DynamoDB tables for posts, comments, votes

echo "Creating posts-prod table..."
aws dynamodb create-table \
  --table-name posts-prod \
  --attribute-definitions \
    AttributeName=postId,AttributeType=S \
    AttributeName=forumId,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=postId,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName": "ForumPostsIndex",
      "KeySchema": [
        {"AttributeName": "forumId", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
      }
    }]' \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5

echo "Creating comments-prod table..."
aws dynamodb create-table \
  --table-name comments-prod \
  --attribute-definitions \
    AttributeName=commentId,AttributeType=S \
    AttributeName=postId,AttributeType=S \
    AttributeName=createdAt,AttributeType=N \
  --key-schema \
    AttributeName=commentId,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName": "PostCommentsIndex",
      "KeySchema": [
        {"AttributeName": "postId", "KeyType": "HASH"},
        {"AttributeName": "createdAt", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
      }
    }]' \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5

echo "Creating votes-prod table..."
aws dynamodb create-table \
  --table-name votes-prod \
  --attribute-definitions \
    AttributeName=voteId,AttributeType=S \
    AttributeName=itemId,AttributeType=S \
  --key-schema \
    AttributeName=voteId,KeyType=HASH \
  --global-secondary-indexes \
    '[{
      "IndexName": "ItemVotesIndex",
      "KeySchema": [
        {"AttributeName": "itemId", "KeyType": "HASH"}
      ],
      "Projection": {"ProjectionType": "ALL"},
      "ProvisionedThroughput": {
        "ReadCapacityUnits": 5,
        "WriteCapacityUnits": 5
      }
    }]' \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5

echo "✅ Tables created successfully!"
echo "Waiting for tables to become active..."
aws dynamodb wait table-exists --table-name posts-prod
aws dynamodb wait table-exists --table-name comments-prod
aws dynamodb wait table-exists --table-name votes-prod
echo "✅ All tables are active!"
