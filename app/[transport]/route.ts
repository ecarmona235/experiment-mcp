import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";
import { env } from "@/app/config/env";
import { Logger } from "@/app/utils/logger";

export const maxDuration = 800;

const logger = new Logger("MCP:Experiment");

const handler = createMcpHandler(
  server => {
    logger.info("Initializing MCP handler");
    //TODO: Resources definition
    //TODO: TOOLS DEFINITION
    //
  },
  // pre setup from when redis is needed.
  // {
  //   redisUrl: env.REDIS_URL,
  //   basePath: "",
  //   verboseLogs: true,
  //   maxDuration: 60,
  // }
);

logger.info("MCP experiment handler created successfully", {
  redisUrl: !!env.REDIS_URL,
  verboseLogs: true,
  maxDuration: 60,
});


export { handler as GET, handler as POST, handler as DELETE };
