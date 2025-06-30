import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/app/config/env";
import { storeTokens } from "@/app/utils/redis";
import { randomUUID } from "crypto";
import { Logger } from "@/app/utils/logger";

// This page should only run on the server side
export const runtime = "nodejs";

const logger = new Logger("OAuth:Callback");

function generateSessionId(): string {
  return randomUUID();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  logger.info("OAuth callback received", {
    hasCode: !!code,
    codeType: typeof code,
    searchParams: Object.fromEntries(searchParams.entries()),
  });

  if (!code || typeof code !== "string") {
    logger.warn("Invalid authorization code received", { code });
    return NextResponse.json(
      { error: "Invalid authorization code" },
      { status: 400 }
    );
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
    const sessionId = searchParams.get("state") || generateSessionId();
    logger.info("Storing tokens in Redis", {
      sessionId,
      hasState: !!searchParams.get("state"),
    });

    await storeTokens(sessionId, response.tokens);

    logger.info("OAuth flow completed successfully");

    return NextResponse.json({
      success: true,
      sessionId,
      message: "OAuth authentication successful",
    });
  } catch (error) {
    logger.error("OAuth Callback Error", error, {
      code: code.substring(0, 10) + "...",
    });
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    );
  }
}
