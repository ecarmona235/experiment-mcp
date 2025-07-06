import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const sheetsTools = [
  {
    name: "get_google_sheet",
    description: "Get a Google Sheet by ID.",
    inputSchema: z.object({
      sheetId: z.string(),
    }),
    handler: async ({ sheetId }: { sheetId: string }) => {
      return await googleAPIService.getGoogleSheet(
        sheetId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "create_google_sheet",
    description: "Create a new Google Sheet.",
    inputSchema: z.object({
      sheet: z.any(),
    }),
    handler: async ({ sheet }: { sheet: any }) => {
      return await googleAPIService.createGoogleSheet(
        sheet,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "update_google_sheet",
    description: "Update a Google Sheet using batchUpdate requests.",
    inputSchema: z.object({
      sheetId: z.string(),
      requests: z.array(z.any()),
    }),
    handler: async ({
      sheetId,
      requests,
    }: {
      sheetId: string;
      requests: any[];
    }) => {
      return await googleAPIService.updateGoogleSheet(
        sheetId,
        requests,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_google_sheets",
    description: "List all Google Sheets.",
    inputSchema: z.object({}),
    handler: async () => {
      return await googleAPIService.listGoogleSheets(env.GOOGLE_MCP_SESSION_ID);
    },
  },
  {
    name: "delete_google_sheet",
    description: "Delete a Google Sheet by ID.",
    inputSchema: z.object({
      sheetId: z.string(),
    }),
    handler: async ({ sheetId }: { sheetId: string }) => {
      return await googleAPIService.deleteGoogleSheet(
        sheetId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
