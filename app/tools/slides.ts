import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const slidesTools = [
  {
    name: "get_google_slide",
    description: "Get a Google Slide (presentation) by ID.",
    inputSchema: z.object({
      slideId: z.string(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      slideId,
      sessionId,
    }: {
      slideId: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.getGoogleSlide(
        slideId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "create_google_slide",
    description: "Create a new Google Slide (presentation).",
    inputSchema: z.object({
      slide: z.any(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      slide,
      sessionId,
    }: {
      slide: any;
      sessionId?: string;
    }) => {
      return await googleAPIService.createGoogleSlide(
        slide,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "update_google_slide",
    description:
      "Update a Google Slide (presentation) using batchUpdate requests.",
    inputSchema: z.object({
      slideId: z.string(),
      requests: z.array(z.any()),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      slideId,
      requests,
      sessionId,
    }: {
      slideId: string;
      requests: any[];
      sessionId?: string;
    }) => {
      return await googleAPIService.updateGoogleSlide(
        slideId,
        requests,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_google_slides",
    description: "List all Google Slides (presentations).",
    inputSchema: z.object({
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({ sessionId }: { sessionId?: string }) => {
      return await googleAPIService.listGoogleSlides(
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "delete_google_slide",
    description: "Delete a Google Slide (presentation) by ID.",
    inputSchema: z.object({
      slideId: z.string(),
      sessionId: z
        .string()
        .optional()
        .describe("Session ID for authentication"),
    }),
    handler: async ({
      slideId,
      sessionId,
    }: {
      slideId: string;
      sessionId?: string;
    }) => {
      return await googleAPIService.deleteGoogleSlide(
        slideId,
        sessionId || env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
