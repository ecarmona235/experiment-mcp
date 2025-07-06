import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const slidesTools = [
  {
    name: "get_google_slide",
    description: "Get a Google Slide (presentation) by ID.",
    inputSchema: z.object({
      slideId: z.string(),
    }),
    handler: async ({ slideId }: { slideId: string }) => {
      return await googleAPIService.getGoogleSlide(
        slideId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "create_google_slide",
    description: "Create a new Google Slide (presentation).",
    inputSchema: z.object({
      slide: z.any(),
    }),
    handler: async ({ slide }: { slide: any }) => {
      return await googleAPIService.createGoogleSlide(
        slide,
        env.GOOGLE_MCP_SESSION_ID
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
    }),
    handler: async ({
      slideId,
      requests,
    }: {
      slideId: string;
      requests: any[];
    }) => {
      return await googleAPIService.updateGoogleSlide(
        slideId,
        requests,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  {
    name: "list_google_slides",
    description: "List all Google Slides (presentations).",
    inputSchema: z.object({}),
    handler: async () => {
      return await googleAPIService.listGoogleSlides(env.GOOGLE_MCP_SESSION_ID);
    },
  },
  {
    name: "delete_google_slide",
    description: "Delete a Google Slide (presentation) by ID.",
    inputSchema: z.object({
      slideId: z.string(),
    }),
    handler: async ({ slideId }: { slideId: string }) => {
      return await googleAPIService.deleteGoogleSlide(
        slideId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
];
