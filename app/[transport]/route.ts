import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { env } from "@/app/config/env";
import { Logger } from "@/app/utils/logger";
import { createAuthResource } from "@/app/resources";
import {
  gmailTools,
  calendarTools,
  driveTools,
  docsTools,
  sheetsTools,
  slidesTools,
} from "@/app/tools";

export const maxDuration = 800;

const logger = new Logger("MCP:Experiment");

const handler = createMcpHandler(server => {
  logger.info("Initializing MCP handler");

  // Register auth resource
  const authResource = createAuthResource();
  server.resource(authResource.name, authResource.uri, authResource.read);
  logger.info("Auth resource registered");

  // Helper function to register tools
  const registerTools = (tools: any[], serviceName: string) => {
    tools.forEach(tool => {
      server.tool(
        tool.name,
        tool.description,
        tool.inputSchema,
        async (args: any) => {
          try {
            const result = await tool.handler(args);
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            logger.error(`Error in ${tool.name}`, {
              error: error instanceof Error ? error.message : "Unknown error",
            });
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      success: false,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }
        }
      );
      logger.info(`${serviceName} tool registered`, { name: tool.name });
    });
  };

  // Register all tools
  registerTools(gmailTools, "Gmail");
  registerTools(calendarTools, "Calendar");
  registerTools(driveTools, "Drive");
  registerTools(docsTools, "Docs");
  registerTools(sheetsTools, "Sheets");
  registerTools(slidesTools, "Slides");
});

logger.info("MCP experiment handler created successfully", {
  redisUrl: !!env.REDIS_URL,
  verboseLogs: true,
  maxDuration: 60,
});

export { handler as GET, handler as POST, handler as DELETE };
