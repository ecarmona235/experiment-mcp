import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { env } from "@/app/config/env";
import { Logger } from "@/app/utils/logger";
import { createAuthResource, googleAPIService } from "@/app/resources";

export const maxDuration = 800;

const logger = new Logger("MCP:Experiment");

const handler = createMcpHandler(server => {
  logger.info("Initializing MCP handler");

  // Register auth resource
  const authResource = createAuthResource();
  server.resource(authResource.name, authResource.uri, authResource.read);
  logger.info("Auth resource registered", {
    name: authResource.name,
    uri: authResource.uri,
  });

  


  //TODO: TOOLS DEFINITION
  //
});

logger.info("MCP experiment handler created successfully", {
  redisUrl: !!env.REDIS_URL,
  verboseLogs: true,
  maxDuration: 60,
});

export { handler as GET, handler as POST, handler as DELETE };
