import { Logger } from "@/app/utils/logger";
import { getTokens, storeTokens } from "@/app/utils/redis";
import { env } from "@/app/config/env";
const logger = new Logger("MCP:Auth:Resource");

export function createAuthResource() {
  return {
    name: "google_oauth_auth",
    uri: "auth://oauth/google",
    description:
      "Google OAuth authentication resource for managing authentication state",
    mimeType: "application/json",

    async read(): Promise<{
      contents: Array<{ uri: string; text: string; mimeType: string }>;
    }> {
      logger.info("Reading auth resource");

      try {
        // Use session ID from Cursor's Secrets (env) if available
        const sessionId = env.GOOGLE_MCP_SESSION_ID;
        logger.info("Session ID found");
        if (!sessionId) {
          return {
            contents: [
              {
                uri: "auth://oauth/google",
                text: JSON.stringify(
                  {
                    authenticated: false,
                    error: "No session ID found.",
                    message:
                      "Please log in and set your session ID in the Cursor Secrets section as MCP_SESSION_ID.",
                    authUrl: "/auth/login",
                  },
                  null,
                  2
                ),
                mimeType: "application/json",
              },
            ],
          };
        }
        logger.info("Session ID found");
        const tokens = await getTokens(sessionId);

        let authData: any;

        if (!tokens) {
          logger.warn("No authentication tokens found");
          authData = {
            authenticated: false,
            message:
              "No authentication tokens found. Please authenticate first.",
            authUrl: "/auth/login",
            sessionId,
          };
        } else {
          logger.info("Authentication tokens found", tokens.expiry_date);

          authData = {
            authenticated: true,
            sessionId,
            tokenType: tokens.token_type,
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiresAt: tokens.expiry_date || null,
            scopes: tokens.scope?.split(" ") || [],
            authUrl: "/auth/login",
          };
        }
        logger.info("Token scopes:", tokens.scope?.split(" ") || []);
        return {
          contents: [
            {
              uri: "auth://oauth/google",
              text: JSON.stringify(authData, null, 2),
              mimeType: "application/json",
            },
          ],
        };
      } catch (error) {
        logger.error("Error reading auth resource", error);
        return {
          contents: [
            {
              uri: "auth://oauth/google",
              text: JSON.stringify(
                {
                  authenticated: false,
                  error: "Failed to read authentication status",
                  message: "Authentication service unavailable",
                  authUrl: "/auth/login",
                },
                null,
                2
              ),
              mimeType: "application/json",
            },
          ],
        };
      }
    },
  };
}
