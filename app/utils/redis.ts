import { kv } from '@vercel/kv';
import { env } from "@/app/config/env";
import { Logger } from "./logger";

const logger = new Logger("Redis");

export async function storeTokens(userId: string, tokens: any) {
  try {
    const key = `oauth_tokens:${userId}`;

    logger.info("Storing OAuth tokens in Vercel Redis", { userId, key });

    // Store tokens with expiration (30 days)
    await kv.setex(key, 60 * 60 * 24 * 30, JSON.stringify(tokens));

    logger.info("OAuth tokens stored successfully", { userId, key });
    return key;
  } catch (error) {
    logger.error("Failed to store tokens in Vercel Redis", error, { userId });
    throw error;
  }
}

export async function getTokens(userId: string) {
  try {
    const key = `oauth_tokens:${userId}`;

    logger.info("Retrieving OAuth tokens from Vercel Redis", { userId, key });

    const tokens = await kv.get(key);

    if (tokens) {
      logger.info("OAuth tokens retrieved successfully");
      return JSON.parse(tokens as string);
    } else {
      logger.warn("No OAuth tokens found for user", { userId });
      return null;
    }
  } catch (error) {
    logger.error("Failed to retrieve tokens from Vercel Redis", error, { userId });
    throw error;
  }
}

// Helper function to test Redis connection
export async function testRedisConnection() {
  try {
    await kv.set('test', 'Hello Vercel Redis!');
    const result = await kv.get('test');
    logger.info("Vercel Redis connection test successful", { result });
    return true;
  } catch (error) {
    logger.error("Vercel Redis connection test failed", error);
    return false;
  }
}
