import { googleAPIService } from "@/app/resources/google-api";
import { z } from "zod";
import { env } from "@/app/config/env";

export const calendarTools = [
  {
    name: "listCalendarEvents",
    description: "List events on a Google Calendar within a time range.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      maxResults: z.number().default(5),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      calendarId,
      timeMin,
      timeMax,
      maxResults,
      sessionId,
    }: {
      calendarId?: string;
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      sessionId?: string;
    }) => {
      return await googleAPIService.listCalendarEvents(
        calendarId,
        timeMin,
        timeMax,
        maxResults,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "createCalendarEvent",
    description: "Create a new event on a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      event: z.any(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      calendarId,
      event,
      sessionId,
    }: {
      calendarId?: string;
      event?: any;
      sessionId?: string;
    }) => {
      return await googleAPIService.createGoogleCalendarEvent(
        calendarId,
        event,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "updateCalendarEvent",
    description: "Update an existing event on a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      eventId: z.string().describe("The ID of the event to update"),
      event: z.any(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      calendarId,
      eventId,
      event,
      sessionId,
    }: {
      calendarId: string;
      eventId: string;
      event?: any;
      sessionId?: string;
    }) => {
      return await googleAPIService.updateGoogleCalendarEvent(
        calendarId,
        eventId,
        event,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "deleteCalendarEvent",
    description: "Delete an existing event on a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      eventId: z.string().describe("The ID of the event to delete"),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      calendarId,
      eventId,
      sessionId,
    }: {
      calendarId?: string;
      eventId: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.deleteGoogleCalendarEvent(
        calendarId,
        eventId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "getCalendar",
    description: "Get a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      calendarId,
      sessionId,
    }: {
      calendarId?: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.getGoogleCalendar(
        calendarId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "updateCalendar",
    description: "Update a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      calendar: z.any(), 
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      calendarId,
      calendar,
      sessionId,
    }: {
      calendarId?: string;
      calendar?: any;
      sessionId?: string;
    }) => {
      return await googleAPIService.updateGoogleCalendar(
        calendarId,
        calendar,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "deleteCalendar",
    description: "Delete a Google Calendar.",
    inputSchema: z.object({
      calendarId: z.string().default("primary"),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      calendarId,
      sessionId,
    }: {
      calendarId?: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.deleteGoogleCalendar(
        calendarId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "createCalendar",
    description: "Create a Google Calendar.",
    inputSchema: z.object({
      calendar: z.any(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      calendar,
      sessionId,
    }: {
      calendar?: any;
      sessionId?: string;
    }) => {
      return await googleAPIService.createGoogleCalendar(
        calendar,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "listCalendars",
    description: "List all Google Calendars.",
    inputSchema: z.object({
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({ sessionId }: { sessionId?: string }) => {
      return await googleAPIService.listGoogleCalendars(
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
