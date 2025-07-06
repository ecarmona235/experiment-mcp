import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const sheetsTools = [
  {
    name: "get_google_sheet",
    description: "Get a Google Sheet by ID.",
    inputSchema: z.object({
      sheetId: z.string(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      sheetId,
      sessionId,
    }: {
      sheetId: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.getGoogleSheet(
        sheetId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "create_google_sheet",
    description: "Create a new Google Sheet.",
    inputSchema: z.object({
      sheet: z.any(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      sheet,
      sessionId,
    }: {
      sheet: any;
      sessionId?: string;
    }) => {
      return await googleAPIService.createGoogleSheet(
        sheet,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "update_google_sheet",
    description: "Update a Google Sheet using batchUpdate requests.",
    inputSchema: z.object({
      sheetId: z.string(),
      requests: z.array(z.any()),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      sheetId,
      requests,
      sessionId,
    }: {
      sheetId: string;
      requests: any[];
      sessionId?: string;
    }) => {
      return await googleAPIService.updateGoogleSheet(
        sheetId,
        requests,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_google_sheets",
    description: "List all Google Sheets.",
    inputSchema: z.object({
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({ sessionId }: { sessionId?: string }) => {
      return await googleAPIService.listGoogleSheets(
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "delete_google_sheet",
    description: "Delete a Google Sheet by ID.",
    inputSchema: z.object({
      sheetId: z.string(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      sheetId,
      sessionId,
    }: {
      sheetId: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.deleteGoogleSheet(
        sheetId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
