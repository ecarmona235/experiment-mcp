import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const driveTools = [
  {
    name: "listGoogleDriveFiles",
    description: "List files in Google Drive.",
    inputSchema: z.object({
      sessionId: z.string().default("default"),
    }),
    handler: async ({ sessionId }: { sessionId?: string }) => {
      return await googleAPIService.listGoogleDriveFiles(
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "getGoogleDriveFile",
    description: "Get a file from Google Drive by fileId.",
    inputSchema: z.object({
      fileId: z.string(),
      sessionId: z.string().default("default"),
    }),
    handler: async ({
      fileId,
      sessionId,
    }: {
      fileId: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.getGoogleDriveFile(
        fileId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "createGoogleDriveFile",
    description: "Create a file in Google Drive (metadata only, no content).",
    inputSchema: z.object({
      file: z.any(),
      sessionId: z.string().default("default"),
    }),
    handler: async ({ file, sessionId }: { file: any; sessionId?: string }) => {
      return await googleAPIService.createGoogleDriveFile(
        file,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "uploadGoogleDriveFile",
    description:
      "Upload a file from disk to Google Drive (with content and metadata).",
    inputSchema: z.object({
      filePath: z.string().describe("Path to the file on disk"),
      metadata: z.any().describe("File metadata, e.g. { name, parents }"),
      sessionId: z.string().default("default"),
    }),
    handler: async ({
      filePath,
      metadata,
      sessionId,
    }: {
      filePath: string;
      metadata: any;
      sessionId?: string;
    }) => {
      return await googleAPIService.uploadGoogleDriveFile(
        filePath,
        metadata,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "downloadGoogleDriveFile",
    description: "Download a file from Google Drive to disk.",
    inputSchema: z.object({
      fileId: z.string().describe("ID of the file in Google Drive"),
      destinationPath: z.string().describe("Path to save the downloaded file"),
      sessionId: z.string().default("default"),
    }),
    handler: async ({
      fileId,
      destinationPath,
      sessionId,
    }: {
      fileId: string;
      destinationPath: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.downloadGoogleDriveFile(
        fileId,
        destinationPath,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "deleteGoogleDriveFile",
    description: "Delete a file from Google Drive by fileId.",
    inputSchema: z.object({
      fileId: z.string(),
      sessionId: z.string().default("default"),
    }),
    handler: async ({
      fileId,
      sessionId,
    }: {
      fileId: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.deleteGoogleDriveFile(
        fileId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
