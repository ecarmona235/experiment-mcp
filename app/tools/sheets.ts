import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const sheetsTools = [
  {
    name: "get_google_sheet",
    description: "Get a Google Sheet by ID.",
    inputSchema: z.object({
      spreadsheetId: z.string(),
    }),
    handler: async ({
      spreadsheetId,
    }: {
      spreadsheetId: string;
    }): Promise<{ success: boolean; sheet?: any; error?: string }> => {
      return await googleAPIService.getGoogleSheet(
        spreadsheetId,
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
    handler: async ({
      sheet,
    }: {
      sheet: any;
    }): Promise<{ success: boolean; sheet?: any; error?: string }> => {
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
      spreadsheetId: z.string(),
      requests: z.array(z.any()),
    }),
    handler: async ({
      spreadsheetId,
      requests,
    }: {
      spreadsheetId: string;
      requests: any[];
    }): Promise<{ success: boolean; response?: any; error?: string }> => {
      return await googleAPIService.updateGoogleSheet(
        spreadsheetId,
        requests,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_google_sheets",
    description: "List all Google Sheets.",
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
      sheets?: any[];
      error?: string;
    }> => {
      return await googleAPIService.listGoogleSheets(env.GOOGLE_MCP_SESSION_ID);
    },
  },
  {
    name: "delete_google_sheet",
    description: "Delete a Google Sheet by ID.",
    inputSchema: z.object({
      spreadsheetId: z.string(),
    }),
    handler: async ({
      spreadsheetId,
    }: {
      spreadsheetId: string;
    }): Promise<{ success: boolean; error?: string }> => {
      return await googleAPIService.deleteGoogleSheet(
        spreadsheetId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
