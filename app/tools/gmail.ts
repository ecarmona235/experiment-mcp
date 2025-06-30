import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";

export const gmailTools = [
  {
    name: "search_gmail",
    description: "Search Gmail messages",
    inputSchema: z.object({
      query: z.string().describe("Search query for Gmail"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results"),
      sessionId: z
        .string()
        .optional()
        .default("default")
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      query,
      maxResults,
      sessionId,
    }: {
      query: string;
      maxResults?: number;
      sessionId?: string;
    }) => {
      return await googleAPIService.searchGmail(query, maxResults, sessionId);
    },
  },
  {
    name: "list_gmail_labels",
    description: "List Gmail labels",
    inputSchema: z.object({
      sessionId: z
        .string()
        .optional()
        .default("default")
        .describe("Session ID for authentication"),
    }),
    handler: async ({ sessionId }: { sessionId?: string }) => {
      return await googleAPIService.listGmailLabels(sessionId);
    },
  },
];
