import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";
import { env } from "@/app/config/env";
import { storeTokens } from "@/app/utils/redis";
import { randomUUID } from "crypto";
import { Logger } from "@/app/utils/logger";

const logger = new Logger("OAuth:Callback");

function generateSessionId(): string {
  return randomUUID();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const code = req.query.code;

  logger.info("OAuth callback received", {
    hasCode: !!code,
    codeType: typeof code,
    query: req.query,
  });

  if (!code || typeof code !== "string") {
    logger.warn("Invalid authorization code received", { code });
    return res.status(400).json({ error: "Invalid authorization code" });
  }

  logger.info("Initializing OAuth2 client");
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  try {
    logger.info("Exchanging authorization code for tokens");
    const response = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(response.tokens);

    logger.info("Tokens received successfully", {
      hasAccessToken: !!response.tokens.access_token,
      hasRefreshToken: !!response.tokens.refresh_token,
      tokenType: response.tokens.token_type,
    });

    // Store tokens in Redis (using a session ID or user ID)
    const sessionId = req.query.state || generateSessionId();
    logger.info("Storing tokens in Redis", {
      sessionId,
      hasState: !!req.query.state,
    });

    await storeTokens(sessionId as string, response.tokens);

    logger.info("OAuth flow completed successfully");

    res.status(200).json({
      success: true,
      sessionId,
      message: "OAuth authentication successful",
    });
  } catch (error) {
    logger.error("OAuth Callback Error", error, {
      code: code.substring(0, 10) + "...",
    });
    res.status(500).json({ error: "Failed to authenticate" });
  }
}
