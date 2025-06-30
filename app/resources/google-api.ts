import { google } from "googleapis";
import { Logger } from "@/app/utils/logger";
import { getRedisClient } from "@/app/utils/redis";
import { env } from "@/app/config/env";
import * as fs from "fs";
import * as path from "path";
import mimeLookup from "mime";

const logger = new Logger("GoogleAPI");

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Build MIME message with HTML content and attachments
 */
function buildMimeMessage(
  to: string,
  subject: string,
  htmlBody: string,
  attachments: { filename: string; path: string }[]
): string {
  logger.info("Building MIME message", {
    to,
    subject,
    htmlBodyLength: htmlBody.length,
    attachmentsCount: attachments.length,
    attachmentNames: attachments.map(a => a.filename),
  });

  const boundary = "__MY_BOUNDARY__";
  const messageParts: string[] = [];

  // Email headers
  messageParts.push(
    `To: ${to}`,
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody
  );

  // Attachments
  attachments.forEach(({ filename, path: filePath }) => {
    logger.info("Processing attachment", { filename, filePath });

    try {
      const fileData = fs.readFileSync(filePath).toString("base64");
      const mimeType =
        mimeLookup.getType(filePath) || "application/octet-stream";

      logger.info("Attachment processed successfully", {
        filename,
        mimeType,
        fileSizeBytes: fs.statSync(filePath).size,
      });

      messageParts.push(
        "",
        `--${boundary}`,
        `Content-Type: ${mimeType}; name="${filename}"`,
        "Content-Transfer-Encoding: base64",
        `Content-Disposition: attachment; filename="${filename}"`,
        "",
        fileData
      );
    } catch (error) {
      logger.error("Error processing attachment", {
        filename,
        filePath,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  });

  // End boundary
  messageParts.push(`--${boundary}--`);

  const result = messageParts.join("\r\n");

  logger.info("MIME message built successfully", {
    totalLength: result.length,
    partsCount: messageParts.length,
  });

  return result;
}

export class GoogleAPIService {
  private async getAuthenticatedClient(sessionId: string = "default") {
    logger.info("Getting authenticated client", { sessionId });

    try {
      const redis = await getRedisClient();
      const tokensJson = await redis.get(`oauth_tokens:${sessionId}`);

      if (!tokensJson) {
        logger.error("No authentication tokens found", { sessionId });
        throw new Error(
          "No authentication tokens found. Please authenticate first."
        );
      }

      const tokens: GoogleTokens = JSON.parse(tokensJson);

      logger.info("Tokens retrieved from Redis", {
        sessionId,
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: new Date(tokens.expires_at * 1000).toISOString(),
      });

      // Check if token is expired
      if (Date.now() >= tokens.expires_at * 1000) {
        logger.warn("Access token expired", {
          sessionId,
          expiresAt: new Date(tokens.expires_at * 1000).toISOString(),
          currentTime: new Date().toISOString(),
        });
        // TODO: Implement token refresh logic
        throw new Error("Token expired. Please re-authenticate.");
      }

      const oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });

      logger.info("OAuth2 client configured successfully", { sessionId });

      return oauth2Client;
    } catch (error) {
      logger.error("Error getting authenticated client", {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async getUserProfile(sessionId: string = "default") {
    logger.info("Getting user profile", { sessionId });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const oauth2 = google.oauth2({ version: "v2", auth });

      logger.info("Fetching user info from Google OAuth2 API");
      const response = await oauth2.userinfo.get();

      logger.info("User profile retrieved successfully", {
        sessionId,
        userId: response.data.id,
        email: response.data.email,
        name: response.data.name,
      });

      return {
        success: true,
        profile: response.data,
      };
    } catch (error) {
      logger.error("Error getting user profile", {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async listGmailLabels(sessionId: string = "default") {
    logger.info("Listing Gmail labels", { sessionId });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      logger.info("Fetching labels from Gmail API");
      const response = await gmail.users.labels.list({
        userId: "me",
      });

      const labels = response.data.labels || [];

      logger.info("Gmail labels retrieved successfully", {
        sessionId,
        labelsCount: labels.length,
        labelNames: labels.map(l => l.name),
      });

      return {
        success: true,
        labels,
        total: labels.length,
      };
    } catch (error) {
      logger.error("Error listing Gmail labels", {
        sessionId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async searchGmail(
    query: string,
    maxResults: number = 5,
    sessionId: string = "default"
  ) {
    logger.info("Searching Gmail", {
      sessionId,
      query,
      maxResults,
    });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      logger.info("Searching messages in Gmail API", { query, maxResults });
      const response = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults,
      });

      const messages = response.data.messages || [];

      logger.info("Initial search results", {
        sessionId,
        query,
        messagesFound: messages.length,
        resultSizeEstimate: response.data.resultSizeEstimate,
      });

      // Get full message details for each message
      logger.info("Fetching full message details", {
        sessionId,
        messageCount: messages.length,
      });

      const messageDetails = await Promise.all(
        messages.map(async (message, index) => {
          logger.info(`Fetching message ${index + 1}/${messages.length}`, {
            sessionId,
            messageId: message.id,
          });

          const detail = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
          });

          return detail.data;
        })
      );

      logger.info("Gmail search completed successfully", {
        sessionId,
        query,
        totalMessages: messageDetails.length,
        messageIds: messageDetails.map(m => m.id),
      });

      return {
        success: true,
        messages: messageDetails,
        total: messageDetails.length,
        query,
      };
    } catch (error) {
      logger.error("Error searching Gmail", {
        sessionId,
        query,
        maxResults,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async createHtmlGmailDraft(
    to: string,
    subject: string,
    htmlBody: string,
    sessionId: string = "default",
    attachments: { filename: string; path: string }[] = []
  ): Promise<{ success: boolean; draftId?: string; error?: string }> {
    logger.info("Creating HTML Gmail draft", {
      to,
      subject,
      sessionId,
      htmlBodyLength: htmlBody.length,
      hasAttachments: attachments.length > 0,
      attachmentCount: attachments.length,
      attachmentNames: attachments.map(a => a.filename),
    });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      logger.info("Building MIME message for draft");
      const rawMimeMessage = buildMimeMessage(
        to,
        subject,
        htmlBody,
        attachments
      );

      logger.info("Encoding message for Gmail API");
      const encodedMessage = Buffer.from(rawMimeMessage)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      logger.info("Creating draft via Gmail API");
      const res = await gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw: encodedMessage,
          },
        },
      });

      logger.info("Gmail draft created successfully", {
        sessionId,
        draftId: res.data.id,
        messageId: res.data.message?.id,
        threadId: res.data.message?.threadId,
      });

      return {
        success: true,
        draftId: res.data.id || undefined,
      };
    } catch (error) {
      logger.error("Error creating Gmail draft", {
        to,
        subject,
        sessionId,
        attachmentsCount: attachments.length,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendGmailDraft(draftId: string, sessionId: string = "default") {
    logger.info("Sending Gmail draft", {
      sessionId,
      draftId,
    });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      logger.info("Sending draft via Gmail API", { draftId });
      const res = await gmail.users.drafts.send({
        userId: "me",
        requestBody: {
          id: draftId,
        },
      });

      logger.info("Gmail draft sent successfully", {
        sessionId,
        draftId,
        messageId: res.data.id,
        threadId: res.data.threadId,
      });

      return {
        success: true,
        message: "Draft sent successfully",
        messageId: res.data.id,
        threadId: res.data.threadId,
      };
    } catch (error) {
      logger.error("Error sending Gmail draft", {
        sessionId,
        draftId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async replyToGmailMessage(
    messageId: string,
    replyText: string,
    sessionId: string = "default",
    attachments: { filename: string; path: string }[] = []
  ) {
    logger.info("Starting Gmail reply process", {
      messageId,
      sessionId,
      replyTextLength: replyText.length,
      attachmentsCount: attachments.length,
      attachmentNames: attachments.map(a => a.filename),
    });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      logger.info("Retrieving original message", { messageId });

      // Get the original message to extract headers
      const originalMessage = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
      });

      const originalHeaders = originalMessage.data.payload?.headers;
      const subject =
        originalHeaders?.find(h => h.name === "Subject")?.value ||
        "Re: No Subject";
      const from = originalHeaders?.find(h => h.name === "From")?.value || "";
      const messageIdHeader =
        originalHeaders?.find(h => h.name === "Message-ID")?.value || "";

      logger.info("Extracted original message headers", {
        subject,
        from,
        hasMessageId: !!messageIdHeader,
        threadId: originalMessage.data.threadId,
      });

      // Build the reply message using buildMimeMessage
      const replySubject = subject.startsWith("Re:")
        ? subject
        : `Re: ${subject}`;
      const htmlBody = `<div>${replyText.replace(/\n/g, "<br>")}</div>`;

      logger.info("Building MIME message", {
        replySubject,
        htmlBodyLength: htmlBody.length,
        attachmentsCount: attachments.length,
      });

      const rawMimeMessage = buildMimeMessage(
        from,
        replySubject,
        htmlBody,
        attachments // Pass the attachments array
      );

      logger.info("MIME message built successfully", {
        rawMessageLength: rawMimeMessage.length,
      });

      // Add reply-specific headers
      const replyHeaders = [
        `In-Reply-To: ${messageIdHeader}`,
        `References: ${messageIdHeader}`,
      ].join("\r\n");

      logger.info("Adding reply headers", {
        replyHeaders,
      });

      // Insert reply headers after the first boundary
      const boundary = "__MY_BOUNDARY__";
      const parts = rawMimeMessage.split(`--${boundary}`);
      const firstPart = parts[0];
      const remainingParts = parts.slice(1);

      const modifiedMessage = [
        firstPart,
        replyHeaders,
        `--${boundary}`,
        ...remainingParts,
      ].join("\r\n");

      logger.info("Modified message with reply headers", {
        modifiedMessageLength: modifiedMessage.length,
        partsCount: parts.length,
      });

      const encodedMessage = Buffer.from(modifiedMessage)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      logger.info("Message encoded for Gmail API", {
        encodedLength: encodedMessage.length,
      });

      // Send the reply
      logger.info("Sending reply via Gmail API");
      const response = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      logger.info("Reply sent successfully", {
        newMessageId: response.data.id,
        threadId: response.data.threadId,
        attachmentsCount: attachments.length,
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
        message: "Reply sent successfully",
        attachmentsCount: attachments.length,
      };
    } catch (error) {
      logger.error("Error replying to Gmail message", {
        messageId,
        sessionId,
        attachmentsCount: attachments.length,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Calendar API
  async listCalendarEvents(
    calendarId: string = "primary",
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 5,
    sessionId: string = "default"
  ) {
    logger.info("Listing calendar events", {
      sessionId,
      calendarId,
      timeMin,
      timeMax,
      maxResults,
    });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendar = google.calendar({ version: "v3", auth });

      const actualTimeMin = timeMin || new Date().toISOString();
      const actualTimeMax =
        timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1 week from now

      logger.info("Fetching calendar events", {
        calendarId,
        timeMin: actualTimeMin,
        timeMax: actualTimeMax,
        maxResults,
      });

      const response = await calendar.events.list({
        calendarId,
        timeMin: actualTimeMin,
        timeMax: actualTimeMax,
        maxResults,
        singleEvents: true,
        orderBy: "startTime",
      });

      const events = response.data.items || [];

      logger.info("Calendar events retrieved successfully", {
        sessionId,
        calendarId,
        eventsCount: events.length,
        eventSummaries: events.map(e => e.summary),
        timeRange: { timeMin: actualTimeMin, timeMax: actualTimeMax },
      });

      return {
        success: true,
        events,
        total: events.length,
        calendarId,
        timeRange: { timeMin: actualTimeMin, timeMax: actualTimeMax },
      };
    } catch (error) {
      logger.error("Error listing calendar events", {
        sessionId,
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const googleAPIService = new GoogleAPIService();
