import { googleAPIService } from "@/app/resources/google-api";
import { z } from "zod";
import { env } from "@/app/config/env";

export const calendarTools = [
  {
    name: "list_calendar_events",
    description:
      "List events from a Google Calendar within a specified time range (ISO 8601 format)",
    inputSchema: z.object({
      calendarId: z
        .string()
        .default("primary")
        .describe("Calendar ID (use 'primary' for main calendar)"),
      timeMin: z
        .string()
        .optional()
        .describe(
          "Start time in ISO 8601 format (e.g., '2024-01-01T00:00:00Z')"
        ),
      timeMax: z
        .string()
        .optional()
        .describe("End time in ISO 8601 format (e.g., '2024-01-31T23:59:59Z')"),
      maxResults: z
        .number()
        .default(5)
        .describe("Maximum number of events to return"),
    }),
    handler: async ({
      calendarId,
      timeMin,
      timeMax,
      maxResults,
    }: {
      calendarId?: string;
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
    }) => {
      return await googleAPIService.listCalendarEvents(
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "create_calendar_event",
    description:
      "Create a new event on a Google Calendar with event details (title, start/end times, attendees, etc.)",
    inputSchema: z.object({
      calendarId: z
        .string()
        .default("primary")
        .describe("Calendar ID (use 'primary' for main calendar)"),
      event: z
        .any()
        .describe(
          "Event object with properties like summary, start, end, attendees, description"
        ),
    }),
    handler: async ({
      calendarId,
      event,
    }: {
      calendarId?: string;
      event?: any;
    }) => {
      return await googleAPIService.createGoogleCalendarEvent(
        calendarId,
        event,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "update_calendar_event",
    description: "Update an existing event on a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      eventId: z.string().describe("The ID of the event to update"),
      event: z.any(),
    }),
    handler: async ({
      calendarId,
      eventId,
      event,
    }: {
      calendarId: string;
      eventId: string;
      event?: any;
    }) => {
      return await googleAPIService.updateGoogleCalendarEvent(
        calendarId,
        eventId,
        event,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "delete_calendar_event",
    description: "Delete an existing event on a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      eventId: z.string().describe("The ID of the event to delete"),
    }),
    handler: async ({
      calendarId,
      eventId,
    }: {
      calendarId?: string;
      eventId: string;
    }) => {
      return await googleAPIService.deleteGoogleCalendarEvent(
        calendarId,
        eventId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "get_calendar",
    description: "Get a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
    }),
    handler: async ({ calendarId }: { calendarId?: string }) => {
      return await googleAPIService.getGoogleCalendar(
        calendarId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "update_calendar",
    description: "Update a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      calendar: z.any(),
    }),
    handler: async ({
      calendarId,
      calendar,
    }: {
      calendarId?: string;
      calendar?: any;
    }) => {
      return await googleAPIService.updateGoogleCalendar(
        calendarId,
        calendar,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "delete_calendar",
    description: "Delete a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
    }),
    handler: async ({ calendarId }: { calendarId?: string }) => {
      return await googleAPIService.deleteGoogleCalendar(
        calendarId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "create_calendar",
    description: "Create a Google Calendar.",
    inputSchema: z.object({
      calendar: z.any(),
    }),
    handler: async ({ calendar }: { calendar?: any }) => {
      return await googleAPIService.createGoogleCalendar(
        calendar,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_calendars",
    description: "List all Google Calendars.",
    inputSchema: z.object({}),
    handler: async () => {
      return await googleAPIService.listGoogleCalendars(
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
