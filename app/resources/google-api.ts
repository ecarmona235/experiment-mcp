import { google } from "googleapis";
import { Logger } from "@/app/utils/logger";
import { getTokens } from "@/app/utils/redis";
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
    logger.info("Getting authenticated client");
    try {
      if (sessionId === "default") {
        sessionId = env.GOOGLE_MCP_SESSION_ID;
      }
      const tokens = await getTokens(sessionId);

      if (!tokens) {
        logger.error("No authentication tokens found");
        throw new Error(
          "No authentication tokens found. Please authenticate first."
        );
      }

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

      logger.info("Gmail draft sent successfully");

      return {
        success: true,
        message: "Draft sent successfully",
        messageId: res.data.id,
        threadId: res.data.threadId,
      };
    } catch (error) {
      logger.error("Error sending Gmail draft", {
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
    logger.info("Getting Gmail message thread", { threadId });

    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const gmail = google.gmail({ version: "v1", auth });

      const response = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
      });

      logger.info("Gmail message thread retrieved successfully", {
        threadId,
        thread: response.data,
      });

      return {
        success: true,
        thread: response.data,
      };
    } catch (error) {
      logger.error("Error getting Gmail message thread", {
        threadId,
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
    logger.info("Getting Google calendar", { calendarId });

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
      const auth = await this.getAuthenticatedClient(sessionId);
      const calendar = google.calendar({ version: "v3", auth });
      const response = await calendar.calendarList.list();
      const calendars = response.data.items || [];
      logger.info("Google calendars retrieved successfully", {
        count: calendars.length,
      });
      return {
        success: true,
        calendars,
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

  // ================================
  // Google Drive API
  // ================================
  async listGoogleDriveFiles(
    sessionId: string = "default"
  ): Promise<{ success: boolean; files?: any[]; error?: string }> {
    logger.info("Listing Google Drive files");
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const drive = google.drive({ version: "v3", auth });

      const response = await drive.files.list();
      const files = response.data.files || [];

      logger.info("Google Drive files retrieved successfully", {
        count: files.length,
      });

      return {
        success: true,
        files,
      };
    } catch (error) {
      logger.error("Error listing Google Drive files", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getGoogleDriveFile(
    fileId: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; file?: any; error?: string }> {
    logger.info("Getting Google Drive file", { fileId });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const drive = google.drive({ version: "v3", auth });

      const response = await drive.files.get({ fileId });

      return {
        success: true,
        file: response.data,
      };
    } catch (error) {
      logger.error("Error getting Google Drive file", {
        fileId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async createGoogleDriveFile(
    file: any,
    sessionId: string = "default"
  ): Promise<{ success: boolean; file?: any; error?: string }> {
    logger.info("Creating Google Drive file", { file });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const drive = google.drive({ version: "v3", auth });

      const response = await drive.files.create({ requestBody: file });

      return {
        success: true,
        file: response.data,
      };
    } catch (error) {
      logger.error("Error creating Google Drive file", {
        file,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async deleteGoogleDriveFile(
    fileId: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; error?: string }> {
    logger.info("Deleting Google Drive file", { fileId });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const drive = google.drive({ version: "v3", auth });

      await drive.files.delete({ fileId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error("Error deleting Google Drive file", {
        fileId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async uploadGoogleDriveFile(
    filePath: string,
    metadata: any,
    sessionId: string = "default"
  ): Promise<{ success: boolean; file?: any; error?: string }> {
    logger.info("Uploading Google Drive file", { filePath, metadata });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const drive = google.drive({ version: "v3", auth });
      const mimeType =
        mimeLookup.getType(filePath) || "application/octet-stream";
      const fileMetadata = metadata; // e.g., { name: "myfile.txt", parents: ["folderId"] }
      const media = {
        mimeType,
        body: fs.createReadStream(filePath),
      };
      const response = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: "id, name, mimeType, parents",
      });
      logger.info("Google Drive file uploaded successfully", {
        id: response.data.id,
      });
      return {
        success: true,
        file: response.data,
      };
    } catch (error) {
      logger.error("Error uploading Google Drive file", {
        filePath,
        metadata,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async downloadGoogleDriveFile(
    fileId: string,
    destinationPath: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; error?: string }> {
    logger.info("Downloading Google Drive file", { fileId, destinationPath });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const drive = google.drive({ version: "v3", auth });
      const dest = fs.createWriteStream(destinationPath);
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );
      await new Promise((resolve, reject) => {
        res.data.on("end", resolve).on("error", reject).pipe(dest);
      });
      logger.info("Google Drive file downloaded successfully", {
        fileId,
        destinationPath,
      });
      return { success: true };
    } catch (error) {
      logger.error("Error downloading Google Drive file", {
        fileId,
        destinationPath,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ================================
  // Google Sheets API
  // ================================

  // List all Google Sheets using the Drive API
  async listGoogleSheets(
    sessionId: string = "default"
  ): Promise<{ success: boolean; sheets?: any[]; error?: string }> {
    logger.info("Listing Google Sheets");
    try {
      const result = await this.listGoogleDriveFiles(sessionId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      const sheetsList = (result.files || []).filter(
        (file: any) =>
          file.mimeType === "application/vnd.google-apps.spreadsheet"
      );
      logger.info("Google Sheets retrieved successfully", {
        count: sheetsList.length,
      });
      return {
        success: true,
        sheets: sheetsList,
      };
    } catch (error) {
      logger.error("Error listing Google Sheets", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Get a Google Sheet by ID (valid)
  async getGoogleSheet(
    sheetId: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; sheet?: any; error?: string }> {
    logger.info("Getting Google Sheet", { sheetId });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const sheets = google.sheets({ version: "v4", auth });
      const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });
      const sheet = response.data;
      logger.info("Google Sheet retrieved successfully", { sheetId });
      return {
        success: true,
        sheet,
      };
    } catch (error) {
      logger.error("Error getting Google Sheet", {
        sheetId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // // Create a Google Sheet (valid)
  // async createGoogleSheet(
  //   sheet: any,
  //   sessionId: string = "default"
  // ): Promise<{ success: boolean; sheet?: any; error?: string }> {
  //   logger.info("Creating Google Sheet", { sheet });
  //   try {
  //     const auth = await this.getAuthenticatedClient(sessionId);
  //     const sheets = google.sheets({ version: "v4", auth });
  //     const response = await sheets.spreadsheets.create({ requestBody: sheet });
  //     const sheetData = response.data;
  //     logger.info("Google Sheet created successfully", {
  //       sheetId: sheetData.spreadsheetId,
  //     });
  //     return {
  //       success: true,
  //       sheet: sheetData,
  //     };
  //   } catch (error) {
  //     logger.error("Error creating Google Sheet", {
  //       sheet,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     });
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // // Update a Google Sheet (use batchUpdate)
  // async updateGoogleSheet(
  //   sheetId: string,
  //   requests: any[],
  //   sessionId: string = "default"
  // ): Promise<{ success: boolean; response?: any; error?: string }> {
  //   logger.info("Updating Google Sheet", { sheetId, requests });
  //   try {
  //     const auth = await this.getAuthenticatedClient(sessionId);
  //     const sheets = google.sheets({ version: "v4", auth });
  //     const response = await sheets.spreadsheets.batchUpdate({
  //       spreadsheetId: sheetId,
  //       requestBody: { requests },
  //     });
  //     logger.info("Google Sheet updated successfully", { sheetId });
  //     return {
  //       success: true,
  //       response: response.data,
  //     };
  //   } catch (error) {
  //     logger.error("Error updating Google Sheet", {
  //       sheetId,
  //       requests,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     });
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // // Delete a Google Sheet using Drive API
  // async deleteGoogleSheet(
  //   sheetId: string,
  //   sessionId: string = "default"
  // ): Promise<{ success: boolean; error?: string }> {
  //   logger.info("Deleting Google Sheet", { sheetId });
  //   // Just call the general Drive file delete
  //   return await this.deleteGoogleDriveFile(sheetId, sessionId);
  // }

  // ================================
  // Google Docs API
  // ================================

  // Get a Google Doc by ID
  async getGoogleDoc(
    docId: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; doc?: any; error?: string }> {
    logger.info("Getting Google Doc", { docId });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const docsApi = google.docs({ version: "v1", auth });
      const response = await docsApi.documents.get({ documentId: docId });
      const doc = response.data;
      logger.info("Google Doc retrieved successfully", { docId });
      return {
        success: true,
        doc,
      };
    } catch (error) {
      logger.error("Error getting Google Doc", {
        docId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // // Create a Google Doc
  // async createGoogleDoc(
  //   doc: any,
  //   sessionId: string = "default"
  // ): Promise<{ success: boolean; doc?: any; error?: string }> {
  //   logger.info("Creating Google Doc", { doc });
  //   try {
  //     const auth = await this.getAuthenticatedClient(sessionId);
  //     const docsApi = google.docs({ version: "v1", auth });
  //     const response = await docsApi.documents.create({ requestBody: doc });
  //     const docData = response.data;
  //     logger.info("Google Doc created successfully", {
  //       docId: docData.documentId,
  //     });
  //     return {
  //       success: true,
  //       doc: docData,
  //     };
  //   } catch (error) {
  //     logger.error("Error creating Google Doc", {
  //       doc,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     });
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // // Update a Google Doc (batchUpdate)
  // async updateGoogleDoc(
  //   documentId: string,
  //   requests: any[],
  //   sessionId: string
  // ) {
  //   logger.info("Updating Google Doc", { documentId, requests });
  //   try {
  //     const auth = await this.getAuthenticatedClient(sessionId);
  //     const docsApi = google.docs({ version: "v1", auth });
  //     const response = await docsApi.documents.batchUpdate({
  //       documentId,
  //       requestBody: { requests },
  //     });
  //     logger.info("Google Doc updated successfully", { documentId });
  //     return {
  //       success: true,
  //       response: response.data,
  //     };
  //   } catch (error) {
  //     logger.error("Error updating Google Doc", {
  //       documentId,
  //       requests,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     });
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // // List Google Docs using Drive API
  async listGoogleDocs(
    sessionId: string = "default"
  ): Promise<{ success: boolean; docs?: any[]; error?: string }> {
    logger.info("Listing Google Docs");
    try {
      const result = await this.listGoogleDriveFiles(sessionId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      const docsList = (result.files || []).filter(
        (file: any) => file.mimeType === "application/vnd.google-apps.document"
      );
      logger.info("Google Docs retrieved successfully", {
        count: docsList.length,
      });
      return {
        success: true,
        docs: docsList,
      };
    } catch (error) {
      logger.error("Error listing Google Docs", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // // Delete a Google Doc using Drive API
  // async deleteGoogleDoc(
  //   docId: string,
  //   sessionId: string = "default"
  // ): Promise<{ success: boolean; error?: string }> {
  //   logger.info("Deleting Google Doc", { docId });
  //   return await this.deleteGoogleDriveFile(docId, sessionId);
  // }

  // ================================
  // Google Slides API
  // ================================

  // Get a Google Slide by ID
  async getGoogleSlide(
    slideId: string,
    sessionId: string = "default"
  ): Promise<{ success: boolean; slide?: any; error?: string }> {
    logger.info("Getting Google Slide", { slideId });
    try {
      const auth = await this.getAuthenticatedClient(sessionId);
      const slidesApi = google.slides({ version: "v1", auth });
      const response = await slidesApi.presentations.get({
        presentationId: slideId,
      });
      const slide = response.data;
      logger.info("Google Slide retrieved successfully", { slideId });
      return {
        success: true,
        slide,
      };
    } catch (error: any) {
      logger.error("Error getting Google Slide", {
        slideId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // // Create a Google Slide
  // async createGoogleSlide(
  //   slide: any,
  //   sessionId: string = "default"
  // ): Promise<{ success: boolean; slide?: any; error?: string }> {
  //   logger.info("Creating Google Slide", { slide });
  //   try {
  //     const auth = await this.getAuthenticatedClient(sessionId);
  //     const slidesApi = google.slides({ version: "v1", auth });
  //     const response = await slidesApi.presentations.create({
  //       requestBody: slide,
  //     });
  //     const slideData = response.data;
  //     logger.info("Google Slide created successfully", {
  //       slideId: slideData.presentationId,
  //     });
  //     return {
  //       success: true,
  //       slide: slideData,
  //     };
  //   } catch (error: any) {
  //     logger.error("Error creating Google Slide", {
  //       slide,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     });
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // // Update a Google Slide (batchUpdate)
  // async updateGoogleSlide(
  //   slideId: string,
  //   requests: any[],
  //   sessionId: string = "default"
  // ): Promise<{ success: boolean; response?: any; error?: string }> {
  //   logger.info("Updating Google Slide", { slideId, requests });
  //   try {
  //     const auth = await this.getAuthenticatedClient(sessionId);
  //     const slidesApi = google.slides({ version: "v1", auth });
  //     const response = await slidesApi.presentations.batchUpdate({
  //       presentationId: slideId,
  //       requestBody: { requests },
  //     });
  //     logger.info("Google Slide updated successfully", { slideId });
  //     return {
  //       success: true,
  //       response: response.data,
  //     };
  //   } catch (error: any) {
  //     logger.error("Error updating Google Slide", {
  //       slideId,
  //       requests,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     });
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error",
  //     };
  //   }
  // }

  // List Google Slides using Drive API (DRY: delegate to listGoogleDriveFiles)
  async listGoogleSlides(
    sessionId: string = "default"
  ): Promise<{ success: boolean; slides?: any[]; error?: string }> {
    logger.info("Listing Google Slides");
    try {
      const result = await this.listGoogleDriveFiles(sessionId);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      const slidesList = (result.files || []).filter(
        (file: any) =>
          file.mimeType === "application/vnd.google-apps.presentation"
      );
      logger.info("Google Slides retrieved successfully", {
        count: slidesList.length,
      });
      return {
        success: true,
        slides: slidesList,
      };
    } catch (error: any) {
      logger.error("Error listing Google Slides", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // // Delete a Google Slide using Drive API (DRY: delegate to deleteGoogleDriveFile)
  // async deleteGoogleSlide(
  //   slideId: string,
  //   sessionId: string = "default"
  // ): Promise<{ success: boolean; error?: string }> {
  //   logger.info("Deleting Google Slide", { slideId });
  //   return await this.deleteGoogleDriveFile(slideId, sessionId);
  // }
}

export const googleAPIService = new GoogleAPIService();
