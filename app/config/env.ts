import dotenv from "dotenv";
dotenv.config();
import { z } from "zod";
import { Logger } from "@/app/utils/logger";
import { env as env_from_file } from "@/app/config/env";

const logger = new Logger("Config:Env");

// Schema for environment variables
const envSchema = z.object({
  REDIS_URL: z.string(),

  GOOGLE_API_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string(), // used for google auth
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_REDIRECT_URI: z.string(),
  GOOGLE_SCOPES: z.string(),
});

// Function to validate environment variables
const validateEnv = () => {
  try {
    logger.info("Validating environment variables");
    const env = {
      REDIS_URL: env_from_file.REDIS_URL,
      GOOGLE_API_KEY: env_from_file.GOOGLE_API_KEY,
      GOOGLE_CLIENT_ID: env_from_file.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: env_from_file.GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI: env_from_file.GOOGLE_REDIRECT_URI,
      GOOGLE_SCOPES: env_from_file.GOOGLE_SCOPES?.split(",").map(scope =>
        scope.trim()
      ), // List of scopes to be used for google auth
    };
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
