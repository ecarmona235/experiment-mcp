import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const gmailTools = [
  {
    name: "search_gmail",
    description:
      "Search Gmail messages using Gmail's search syntax (e.g., 'from:example@gmail.com', 'subject:meeting', 'has:attachment')",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Gmail search query (supports Gmail search operators)"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
    }),
    handler: async ({
      query,
      maxResults,
    }: {
      query: string;
      maxResults?: number;
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
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_gmail_labels",
    description: "List Gmail labels",
    inputSchema: z.object({}),
    handler: async (): Promise<{
      success: boolean;
      labels?: any[];
      total?: number;
      error?: string;
    }> => {
      return await googleAPIService.listGmailLabels(env.GOOGLE_MCP_SESSION_ID);
    },
  },

  {
    name: "create_html_gmail_draft",
    description:
      "Create a Gmail draft with HTML content and optional file attachments",
    inputSchema: z.object({
      to: z.string().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      htmlBody: z.string().describe("HTML content of the email body"),
      attachments: z
        .array(
          z.object({
            filename: z.string().describe("Name of the attachment file"),
            path: z.string().describe("Local file path to the attachment"),
          })
        )
        .optional()
        .default([])
        .describe("Array of file attachments to include"),
    }),
    handler: async ({
      to,
      subject,
      htmlBody,
      attachments,
    }: {
      to: string;
      subject: string;
      htmlBody: string;
      attachments?: { filename: string; path: string }[];
    }): Promise<{ success: boolean; draftId?: string; error?: string }> => {
      return await googleAPIService.createHtmlGmailDraft(
        to,
        subject,
        htmlBody,
        env.GOOGLE_MCP_SESSION_ID,
        attachments
      );
    },
  },

  {
    name: "send_gmail_draft",
    description: "Send a Gmail draft",
    inputSchema: z.object({
      draftId: z.string().describe("ID of the draft to send"),
    }),
    handler: async ({
      draftId,
    }: {
      draftId: string;
    }): Promise<{
      success: boolean;
      message?: string;
      messageId?: string | null;
      threadId?: string | null;
      error?: string;
    }> => {
      return await googleAPIService.sendGmailDraft(
        draftId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },

  {
    name: "reply_to_gmail_message",
    description: "Reply to a Gmail message",
    inputSchema: z.object({
      messageId: z.string().describe("ID of the message to reply to"),
      replyText: z.string().describe("Text content of the reply"),
      attachments: z
        .array(
          z.object({
            filename: z.string().describe("Name of the attachment file"),
            path: z.string().describe("Local file path to the attachment"),
          })
        )
        .optional()
        .default([])
        .describe("Array of attachments"),
    }),
    handler: async ({
      messageId,
      replyText,
      attachments,
    }: {
      messageId: string;
      replyText: string;
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
        env.GOOGLE_MCP_SESSION_ID,
        attachments
      );
    },
  },

  {
    name: "get_gmail_message",
    description: "Get a Gmail message",
    inputSchema: z.object({
      messageId: z.string().describe("ID of the message to get"),
    }),
    handler: async ({
      messageId,
    }: {
      messageId: string;
    }): Promise<{ success: boolean; message?: any; error?: string }> => {
      return await googleAPIService.getGmailMessage(
        messageId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },

  {
    name: "get_gmail_message_thread",
    description: "Get a Gmail message thread",
    inputSchema: z.object({
      threadId: z.string().describe("ID of the thread to get"),
    }),
    handler: async ({
      threadId,
    }: {
      threadId: string;
    }): Promise<{ success: boolean; thread?: any; error?: string }> => {
      return await googleAPIService.getGmailMessageThread(
        threadId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
