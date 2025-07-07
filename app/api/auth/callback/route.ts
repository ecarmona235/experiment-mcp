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
  // Redirect to HTTPS if not already 
  // useful if not running on localhost
  // const proto = request.headers.get("x-forwarded-proto");
  // if (proto && proto !== "https") {
  //   const url = new URL(request.url);
  //   url.protocol = "https:";
  //   return NextResponse.redirect(url.toString(), 307);
  // }

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

    logger.info("Tokens received successfully");

    // Store tokens in Redis (using a session ID or user ID)
    const sessionId = searchParams.get("state") || generateSessionId();
    logger.info("Storing tokens in Redis");

    await storeTokens(sessionId, response.tokens);

    logger.info("OAuth flow completed successfully");

    // Return an HTML page with instructions
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>OAuth Success</title>
        <style>
          body { font-family: sans-serif; background: #f9f9f9; color: #222; padding: 2em; }
          .container { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #0001; padding: 2em; max-width: 500px; margin: 2em auto; }
          code { background: #eee; padding: 0.2em 0.4em; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>OAuth Authentication Successful!</h2>
          <p>Your session ID is:</p>
          <p><code>${sessionId}</code></p>
          <p>
            <strong>Copy this session ID and add it as a secret in Cursor:</strong><br>
            <code>GOOGLE_MCP_SESSION_ID</code> = <code>${sessionId}</code>
          </p>
          <p>
            In Cursor, go to the <b>Secrets</b> section and add a new secret with the name <code>GOOGLE_MCP_SESSION_ID</code> and the value above.<br>
            Then, re-run your MCP tool or resource.
          </p>
        </div>
      </body>
      </html>`,
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
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
