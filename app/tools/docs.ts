import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const docsTools = [
  {
    name: "get_google_doc",
    description: "Get a Google Doc by ID.",
    inputSchema: z.object({
      docId: z.string(),
    }),
    handler: async ({ docId }: { docId: string }) => {
      return await googleAPIService.getGoogleDoc(
        docId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "create_google_doc",
    description: "Create a new Google Doc.",
    inputSchema: z.object({
      doc: z.any(),
    }),
    handler: async ({ doc }: { doc: any }) => {
      return await googleAPIService.createGoogleDoc(
        doc,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "update_google_doc",
    description: "Update a Google Doc using batchUpdate requests.",
    inputSchema: z.object({
      docId: z.string(),
      requests: z.array(z.any()),
    }),
    handler: async ({
      docId,
      requests,
    }: {
      docId: string;
      requests: any[];
    }) => {
      return await googleAPIService.updateGoogleDoc(
        docId,
        requests,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_google_docs",
    description: "List all Google Docs.",
    inputSchema: z.object({}),
    handler: async () => {
      return await googleAPIService.listGoogleDocs(env.GOOGLE_MCP_SESSION_ID);
    },
  },
  {
    name: "delete_google_doc",
    description: "Delete a Google Doc by ID.",
    inputSchema: z.object({
      docId: z.string(),
    }),
    handler: async ({ docId }: { docId: string }) => {
      return await googleAPIService.deleteGoogleDoc(
        docId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
