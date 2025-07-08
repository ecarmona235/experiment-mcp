import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";
import { Logger } from "@/app/utils/logger";
const logger = new Logger("DocsTools");

export const docsTools = [
  {
    name: "get_google_doc",
    description: "Get a Google Doc by ID.",
    inputSchema: z.object({
      docId: z.string(),
    }),
    handler: async ({
      docId,
    }: {
      docId: string;
    }): Promise<{ success: boolean; doc?: any; error?: string }> => {
      return await googleAPIService.getGoogleDoc(
        docId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  // {
  //   name: "create_google_doc",
  //   description: "Create a new Google Doc.",
  //   inputSchema: z.object({
  //     doc: z.any(),
  //   }),
  //   handler: async ({
  //     doc,
  //   }: {
  //     doc: any;
  //   }): Promise<{ success: boolean; doc?: any; error?: string }> => {
  //     return await googleAPIService.createGoogleDoc(
  //       doc,
  //       env.GOOGLE_MCP_SESSION_ID
  //     );
  //   },
  // },
  // {
  //   name: "update_google_doc",
  //   description: "Update a Google Doc using batchUpdate requests.",
  //   inputSchema: z.object({
  //     documentId: z.string(),
  //     requests: z.array(z.any()),
  //   }),
  //   handler: async ({
  //     documentId,
  //     requests,
  //   }: {
  //     documentId: string;
  //     requests: any[];
  //   }): Promise<{ success: boolean; response?: any; error?: string }> => {
  //     logger.info("Updating Google Doc", { documentId, requests });
  //     return await googleAPIService.updateGoogleDoc(
  //       documentId,
  //       requests,
  //       env.GOOGLE_MCP_SESSION_ID
  //     );
  //   },
  // },
  {
    name: "list_google_docs",
    description: "List all Google Docs.",
    inputSchema: z.object({
      random_string: z
        .string()
        .optional()
        .describe("Optional parameter to ensure tool can be called"),
    }),
    handler: async ({
      random_string,
    }: {
      random_string?: string;
    }): Promise<{
      success: boolean;
      docs?: any[];
      error?: string;
    }> => {
      return await googleAPIService.listGoogleDocs(env.GOOGLE_MCP_SESSION_ID);
    },
  },
  // {
  //   name: "delete_google_doc",
  //   description: "Delete a Google Doc by ID.",
  //   inputSchema: z.object({
  //     docId: z.string(),
  //   }),
  //   handler: async ({
  //     docId,
  //   }: {
  //     docId: string;
  //   }): Promise<{ success: boolean; error?: string }> => {
  //     return await googleAPIService.deleteGoogleDoc(
  //       docId,
  //       env.GOOGLE_MCP_SESSION_ID
  //     );
  //   },
  // },
];
