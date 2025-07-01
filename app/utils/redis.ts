import { createClient } from "redis";
import { env } from "@/app/config/env";
import { Logger } from "./logger";

const logger = new Logger("Redis");

let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (!redisClient) {
    logger.info("Creating new Redis client connection");
    redisClient = createClient({
      url: env.REDIS_URL,
    });

    try {
      await redisClient.connect();
      logger.info("Redis client connected successfully");
    } catch (error) {
      logger.error("Failed to connect to Redis", error);
      throw error;
    }
  }

  return redisClient;
}

export async function storeTokens(userId: string, tokens: any) {
  try {
    const client = await getRedisClient();
    const key = `oauth_tokens:${userId}`;

    logger.info("Storing OAuth tokens in Redis", { userId, key });

    // Store tokens with expiration (e.g., 1 hour for access token)
    await client.setEx(key, 60 * 60 * 24 * 30, JSON.stringify(tokens));

    logger.info("OAuth tokens stored successfully", { userId, key });
    return key;
  } catch (error) {
    logger.error("Failed to store tokens in Redis", error, { userId });
    throw error;
  }
}

export async function getTokens(userId: string) {
  try {
    const client = await getRedisClient();
    const key = `oauth_tokens:${userId}`;

    logger.info("Retrieving OAuth tokens from Redis", { userId, key });

    const tokens = await client.get(key);

    if (tokens) {
      logger.info("OAuth tokens retrieved successfully", { userId });
      return JSON.parse(tokens);
    } else {
      logger.warn("No OAuth tokens found for user", { userId });
      return null;
    }
  } catch (error) {
    logger.error("Failed to retrieve tokens from Redis", error, { userId });
    throw error;
  }
}
