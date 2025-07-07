import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const driveTools = [
  {
    name: "list_google_drive_files",
    description:
      "List files and folders in your Google Drive (returns file metadata, not content)",
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
      files?: any[];
      error?: string;
    }> => {
      return await googleAPIService.listGoogleDriveFiles(
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "get_google_drive_file",
    description: "Get a file from Google Drive by fileId.",
    inputSchema: z.object({
      fileId: z.string(),
    }),
    handler: async ({
      fileId,
    }: {
      fileId: string;
    }): Promise<{ success: boolean; file?: any; error?: string }> => {
      return await googleAPIService.getGoogleDriveFile(
        fileId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "create_google_drive_file",
    description:
      "Create a new file in Google Drive with metadata only (creates empty file, use upload_google_drive_file for content)",
    inputSchema: z.object({
      file: z
        .any()
        .describe(
          "File metadata object with properties like name, mimeType, parents"
        ),
    }),
    handler: async ({
      file,
    }: {
      file: any;
    }): Promise<{ success: boolean; file?: any; error?: string }> => {
      return await googleAPIService.createGoogleDriveFile(
        file,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "upload_google_drive_file",
    description:
      "Upload a file from disk to Google Drive (with content and metadata).",
    inputSchema: z.object({
      filePath: z.string().describe("Path to the file on disk"),
      metadata: z.any().describe("File metadata, e.g. { name, parents }"),
    }),
    handler: async ({
      filePath,
      metadata,
    }: {
      filePath: string;
      metadata: any;
    }): Promise<{ success: boolean; file?: any; error?: string }> => {
      return await googleAPIService.uploadGoogleDriveFile(
        filePath,
        metadata,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "download_google_drive_file",
    description: "Download a file from Google Drive to disk.",
    inputSchema: z.object({
      fileId: z.string().describe("ID of the file in Google Drive"),
      destinationPath: z.string().describe("Path to save the downloaded file"),
    }),
    handler: async ({
      fileId,
      destinationPath,
    }: {
      fileId: string;
      destinationPath: string;
    }): Promise<{ success: boolean; error?: string }> => {
      return await googleAPIService.downloadGoogleDriveFile(
        fileId,
        destinationPath,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "delete_google_drive_file",
    description: "Delete a file from Google Drive by fileId.",
    inputSchema: z.object({
      fileId: z.string(),
    }),
    handler: async ({
      fileId,
    }: {
      fileId: string;
    }): Promise<{ success: boolean; error?: string }> => {
      return await googleAPIService.deleteGoogleDriveFile(
        fileId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
