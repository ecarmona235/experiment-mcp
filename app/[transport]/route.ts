import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { env } from "@/app/config/env";
import { Logger } from "@/app/utils/logger";
import { createAuthResource } from "@/app/resources";
import { gmailTools, calendarTools } from "@/app/tools";

export const maxDuration = 800;

const logger = new Logger("MCP:Experiment");

const handler = createMcpHandler(server => {
  logger.info("Initializing MCP handler");

  // Register auth resource
  const authResource = createAuthResource();
  server.resource(authResource.name, authResource.uri, authResource.read);
  logger.info("Auth resource registered");

  // Register Gmail tools
  gmailTools.forEach(tool => {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema.shape,
      async (args: any) => {
        const result = await tool.handler(args);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );
    logger.info("Gmail tool registered", { name: tool.name });
  });

  // Register calendar tools
  calendarTools.forEach(tool => {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema.shape,
      async (args: any) => {
        const result = await tool.handler(args);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }
    );
    logger.info("Calendar tool registered", { name: tool.name });
  });
});

logger.info("MCP experiment handler created successfully", {
  redisUrl: !!env.REDIS_URL,
  verboseLogs: true,
  maxDuration: 60,
});

export { handler as GET, handler as POST, handler as DELETE };
