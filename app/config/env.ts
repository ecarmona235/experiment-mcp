import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";
import { Logger } from "@/app/utils/logger";

const logger = new Logger("Config:Env");

// Schema for environment variables
const envSchema = z.object({
  REDIS_URL: z.string(),
  GOOGLE_API_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string(), // used for google auth
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  GOOGLE_SCOPES: z.array(z.string()),
  GOOGLE_MCP_SESSION_ID: z.string(),
});

// Function to validate environment variables
const validateEnv = () => {
  try {
    logger.info("Validating environment variables");
    const env = {
      REDIS_URL: process.env.REDIS_URL,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
      GOOGLE_MCP_SESSION_ID: process.env.GOOGLE_MCP_SESSION_ID,
      GOOGLE_SCOPES: process.env.GOOGLE_SCOPES?.split(",").map(scope =>
        scope.trim()
      ), // List of scopes to be used for google auth
    };
    logger.info("Environment variables");
    const parsed = envSchema.parse(env);
    logger.info("Environment variables validated successfully");

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join("."));
      logger.error("Invalid environment variables", { error: { missingVars } });
      throw new Error(
        `❌ Invalid environment variables: ${missingVars.join(
          ", "
        )}. Please check your .env file`
      );
    }
    throw error;
  }
};

export const env = validateEnv();
