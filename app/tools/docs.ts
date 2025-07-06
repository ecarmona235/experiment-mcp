import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const docsTools = [
  {
    name: "get_google_doc",
    description: "Get a Google Doc by ID.",
    inputSchema: z.object({
      docId: z.string(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      docId,
      sessionId,
    }: {
      docId: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.getGoogleDoc(
        docId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "create_google_doc",
    description: "Create a new Google Doc.",
    inputSchema: z.object({
      doc: z.any(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({ doc, sessionId }: { doc: any; sessionId?: string }) => {
      return await googleAPIService.createGoogleDoc(
        doc,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "update_google_doc",
    description: "Update a Google Doc using batchUpdate requests.",
    inputSchema: z.object({
      docId: z.string(),
      requests: z.array(z.any()),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      docId,
      requests,
      sessionId,
    }: {
      docId: string;
      requests: any[];
      sessionId?: string;
    }) => {
      return await googleAPIService.updateGoogleDoc(
        docId,
        requests,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_google_docs",
    description: "List all Google Docs.",
    inputSchema: z.object({
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({ sessionId }: { sessionId?: string }) => {
      return await googleAPIService.listGoogleDocs(
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "delete_google_doc",
    description: "Delete a Google Doc by ID.",
    inputSchema: z.object({
      docId: z.string(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      docId,
      sessionId,
    }: {
      docId: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.deleteGoogleDoc(
        docId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
