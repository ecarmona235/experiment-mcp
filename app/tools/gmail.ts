import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

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
    }): Promise<{
      success: boolean;
      messages?: any[];
      total?: number;
      query?: string;
      error?: string;
    }> => {
      return await googleAPIService.searchGmail(
        query,
        maxResults,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_gmail_labels",
    description: "List Gmail labels",
    inputSchema: z.object({
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      sessionId,
    }: {
      sessionId?: string;
    }): Promise<{
      success: boolean;
      labels?: any[];
      total?: number;
      error?: string;
    }> => {
      return await googleAPIService.listGmailLabels(
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },

  {
    name: "create_html_gmail_draft",
    description: "Create a HTML Gmail draft",
    inputSchema: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject"),
      htmlBody: z.string().describe("HTML content of the email"),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            path: z.string(),
          })
        )
        .optional()
        .default([])
        .describe("Array of attachments"),
    }),
    handler: async ({
      to,
      subject,
      htmlBody,
      sessionId,
      attachments,
    }: {
      to: string;
      subject: string;
      htmlBody: string;
      sessionId?: string;
      attachments?: { filename: string; path: string }[];
    }): Promise<{ success: boolean; draftId?: string; error?: string }> => {
      return await googleAPIService.createHtmlGmailDraft(
        to,
        subject,
        htmlBody,
        sessionId || env.GOOGLE_MCP_SESSION_ID,
        attachments
      );
    },
  },

  {
    name: "send_gmail_draft",
    description: "Send a Gmail draft",
    inputSchema: z.object({
      draftId: z.string().describe("ID of the draft to send"),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      draftId,
      sessionId,
    }: {
      draftId: string;
      sessionId?: string;
    }): Promise<{
      success: boolean;
      message?: string;
      messageId?: string | null;
      threadId?: string | null;
      error?: string;
    }> => {
      return await googleAPIService.sendGmailDraft(
        draftId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },

  {
    name: "reply_to_gmail_message",
    description: "Reply to a Gmail message",
    inputSchema: z.object({
      messageId: z.string().describe("ID of the message to reply to"),
      replyText: z.string().describe("Text content of the reply"),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
      attachments: z
        .array(
          z.object({
            filename: z.string(),
            path: z.string(),
          })
        )
        .optional()
        .default([])
        .describe("Array of attachments"),
    }),
    handler: async ({
      messageId,
      replyText,
      sessionId,
      attachments,
    }: {
      messageId: string;
      replyText: string;
      sessionId?: string;
      attachments?: { filename: string; path: string }[];
    }): Promise<{
      success: boolean;
      messageId?: string | null;
      threadId?: string | null;
      message?: string;
      attachmentsCount?: number;
      error?: string;
    }> => {
      return await googleAPIService.replyToGmailMessage(
        messageId,
        replyText,
        sessionId || env.GOOGLE_MCP_SESSION_ID,
        attachments
      );
    },
  },

  {
    name: "get_gmail_message",
    description: "Get a Gmail message",
    inputSchema: z.object({
      messageId: z.string().describe("ID of the message to get"),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      messageId,
      sessionId,
    }: {
      messageId: string;
      sessionId?: string;
    }): Promise<{ success: boolean; message?: any; error?: string }> => {
      return await googleAPIService.getGmailMessage(
        messageId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },

  {
    name: "get_gmail_message_thread",
    description: "Get a Gmail message thread",
    inputSchema: z.object({
      threadId: z.string().describe("ID of the thread to get"),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      threadId,
      sessionId,
    }: {
      threadId: string;
      sessionId?: string;
    }): Promise<{ success: boolean; thread?: any; error?: string }> => {
      return await googleAPIService.getGmailMessageThread(
        threadId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
