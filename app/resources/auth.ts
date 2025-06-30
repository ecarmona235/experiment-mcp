import { Logger } from "@/app/utils/logger";
import { getTokens, storeTokens } from "@/app/utils/redis";

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
        // For now, use a default session - in production you'd get this from context
        const sessionId = "default";
        const tokens = await getTokens(sessionId);

        let authData: any;

        if (!tokens) {
          logger.warn("No authentication tokens found", { sessionId });
          authData = {
            authenticated: false,
            message:
              "No authentication tokens found. Please authenticate first.",
            authUrl: "/auth/login",
            sessionId,
          };
        } else {
          logger.info("Authentication tokens found", {
            sessionId,
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
          });

          authData = {
            authenticated: true,
            sessionId,
            tokenType: tokens.token_type,
            hasAccessToken: !!tokens.access_token,
            hasRefreshToken: !!tokens.refresh_token,
            expiresAt: tokens.expiry_date,
            scopes: tokens.scope?.split(" ") || [],
            authUrl: "/auth/login",
          };
        }

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
