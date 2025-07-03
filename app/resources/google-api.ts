import { google } from "googleapis";
import { Logger } from "@/app/utils/logger";
import { getRedisClient } from "@/app/utils/redis";
import { env } from "@/app/config/env";
import * as fs from "fs";
import mimeLookup from "mime";

const logger = new Logger("GoogleAPI");

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
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
  // ================================
  // Authentication
  // ================================
  private async getAuthenticatedClient(sessionId: string) {
    logger.info("Getting authenticated client", { sessionId });
    try {
      if (sessionId === "default") {
        sessionId = env.GOOGLE_MCP_SESSION_ID;
      }
      const redis = await getRedisClient();
      const tokensJson = await redis.get(`oauth_tokens:${sessionId}`);

      if (!tokensJson) {
        logger.error("No authentication tokens found", { sessionId });
        throw new Error(
          "No authentication tokens found. Please authenticate first."
        );
      }
      const tokens: GoogleTokens = JSON.parse(tokensJson);

      logger.info(
        "Tokens retrieved from Redis",
        tokens.scope?.split(" ") || []
      );

      // Check if token is expired
      if (Date.now() >= tokens.expires_at * 1000) {
        logger.warn("Access token expired", {
          expiresAt: new Date(tokens.expires_at * 1000).toISOString(),
          currentTime: new Date().toISOString(),
        });
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

      logger.info("OAuth2 client configured successfully");

      return oauth2Client;
    } catch (error) {
      logger.error("Error getting authenticated client", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }
  // ================================
  // Google User profile
  // ================================
  async getUserProfile(
    sessionId: string = "default"
  ): Promise<{ success: boolean; profile?: any; error?: string }> {
    logger.info("Getting user profile");

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const oauth2 = google.oauth2({ version: "v2", auth });

      logger.info("Fetching user info from Google OAuth2 API");
      const response = await oauth2.userinfo.get();

      logger.info("User profile retrieved successfully");

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

  // ================================
  // Gmail API
  // ================================
  async listGmailLabels(sessionId: string = "default"): Promise<{
    success: boolean;
    labels?: any[];
    total?: number;
    error?: string;
  }> {
    logger.info("Listing Gmail labels");

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      logger.info("Fetching labels from Gmail API");
      const response = await gmail.users.labels.list({
        userId: "me",
      });

      const labels = response.data.labels || [];

      logger.info("Gmail labels retrieved successfully");

      return {
        success: true,
        labels,
        total: labels.length,
      };
    } catch (error) {
      logger.error("Error listing Gmail labels", {
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
  ): Promise<{
    success: boolean;
    messages?: any[];
    total?: number;
    query?: string;
    error?: string;
  }> {
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      logger.info("Searching messages in Gmail API");
      const response = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults,
      });

      const messages = response.data.messages || [];

      logger.info("Initial search results");

      // Get full message details for each message
      logger.info("Fetching full message details");

      const messageDetails = await Promise.all(
        messages.map(async (message, index) => {
          logger.info(`Fetching message `);

          const detail = await gmail.users.messages.get({
            userId: "me",
            id: message.id!,
          });

          return detail.data;
        })
      );

      logger.info("Gmail search completed successfully");

      return {
        success: true,
        messages: messageDetails,
        total: messageDetails.length,
        query,
      };
    } catch (error) {
      logger.error("Error searching Gmail", {
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

  async sendGmailDraft(
    draftId: string,
    sessionId: string = "default"
  ): Promise<{
    success: boolean;
    message?: string;
    messageId?: string | null;
    threadId?: string | null;
    error?: string;
  }> {
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
  ): Promise<{
    success: boolean;
    messageId?: string | null;
    threadId?: string | null;
    message?: string;
    attachmentsCount?: number;
    error?: string;
  }> {
    logger.info("Starting Gmail reply process", {
      messageId,
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

  async getGmailMessage(
    messageId: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; message?: any; error?: string }> {
    logger.info("Getting Gmail message", { messageId });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
      });

      logger.info("Gmail message retrieved successfully", {
        messageId,
        message: response.data,
      });

      return {
        success: true,
        message: response.data,
      };
    } catch (error) {
      logger.error("Error getting Gmail message", {
        messageId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getGmailMessageThread(
    threadId: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; thread?: any; error?: string }> {
    logger.info("Getting Gmail message thread", { threadId, sessionId });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
      });

      logger.info("Gmail message thread retrieved successfully", {
        threadId,
        sessionId,
        thread: response.data,
      });

      return {
        success: true,
        thread: response.data,
      };
    } catch (error) {
      logger.error("Error getting Gmail message thread", {
        threadId,
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
  // ================================
  // Calendar Events API
  // ================================
  async listCalendarEvents(
    calendarId: string = "primary",
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 5,
    sessionId: string = "default"
  ): Promise<{
    success: boolean;
    events?: any[];
    total?: number;
    calendarId?: string;
    timeRange?: { timeMin?: string; timeMax?: string };
    error?: string;
  }> {
    logger.info("Listing calendar events", {
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

  async createGoogleCalendarEvent(
    calendarId: string = "primary",
    event: any,
    sessionId: string = "default"
  ): Promise<{ success: boolean; event?: any; error?: string }> {
    logger.info("Creating Google calendar event", { calendarId, event });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendar = google.calendar({ version: "v3", auth });

      const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      return {
        success: true,
        event: response.data,
      };
    } catch (error) {
      logger.error("Error creating Google calendar event", {
        calendarId,
        event,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateGoogleCalendarEvent(
    calendarId: string = "primary",
    eventId: string,
    event: any,
    sessionId: string = "default"
  ): Promise<{ success: boolean; event?: any; error?: string }> {
    logger.info("Updating Google calendar event");

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendar = google.calendar({ version: "v3", auth });

      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event,
      });

      return {
        success: true,
        event: response.data,
      };
    } catch (error) {
      logger.error("Error updating Google calendar event", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteGoogleCalendarEvent(
    calendarId: string = "primary",
    eventId: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; error?: string }> {
    logger.info("Deleting Google calendar event", { calendarId, eventId });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendar = google.calendar({ version: "v3", auth });

      await calendar.events.delete({
        calendarId,
        eventId,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error deleting Google calendar event", {
        calendarId,
        eventId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ================================
  // Calendar Calendars API
  // ================================

  async getGoogleCalendar(
    calendarId: string = "primary",
    sessionId: string = "default"
  ): Promise<{ success: boolean; calendar?: any; error?: string }> {
    logger.info("Getting Google calendar", { calendarId, sessionId });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendar = google.calendar({ version: "v3", auth });

      const response = await calendar.calendars.get({
        calendarId,
      });

      return {
        success: true,
        calendar: response.data,
      };
    } catch (error) {
      logger.error("Error getting Google calendar", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async updateGoogleCalendar(
    calendarId: string = "primary",
    calendar: any,
    sessionId: string = "default"
  ): Promise<{ success: boolean; calendar?: any; error?: string }> {
    logger.info("Updating Google calendar", { calendarId, calendar });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendarService = google.calendar({ version: "v3", auth });

      const response = await calendarService.calendars.update({
        calendarId,
        requestBody: calendar,
      });

      return {
        success: true,
        calendar: response.data,
      };
    } catch (error) {
      logger.error("Error updating Google calendar", {
        calendarId,
        calendar,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteGoogleCalendar(
    calendarId: string = "primary",
    sessionId: string = "default"
  ): Promise<{ success: boolean; error?: string }> {
    logger.info("Deleting Google calendar", { calendarId });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendarService = google.calendar({ version: "v3", auth });

      await calendarService.calendars.delete({
        calendarId,
      });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error deleting Google calendar", {
        calendarId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async createGoogleCalendar(
    calendar: any,
    sessionId: string = "default"
  ): Promise<{ success: boolean; calendar?: any; error?: string }> {
    logger.info("Creating Google calendar", { calendar });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendarService = google.calendar({ version: "v3", auth });

      const response = await calendarService.calendars.insert({
        requestBody: calendar,
      });

      return {
        success: true,
        calendar: response.data,
      };
    } catch (error) {
      logger.error("Error creating Google calendar", {
        calendar,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async listGoogleCalendars(
    sessionId: string = "default"
  ): Promise<{ success: boolean; calendars?: any[]; error?: string }> {
    logger.info("Listing Google calendars");
    try {
      logger.info("Getting authenticated client", { sessionId });
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendarService = google.calendar({ version: "v3", auth });

      const response = await calendarService.calendarList.list({});

      return {
        success: true,
        calendars: response.data.items,
      };
    } catch (error) {
      logger.error("Error listing Google calendars", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const googleAPIService = new GoogleAPIService();
