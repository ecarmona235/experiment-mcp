import { z } from "zod";
import { googleAPIService } from "@/app/resources/google-api";
import { env } from "@/app/config/env";

export const slidesTools = [
  {
    name: "get_google_slide",
    description: "Get a Google Slide (presentation) by ID.",
    inputSchema: z.object({
      presentationId: z.string(),
    }),
    handler: async ({
      presentationId,
    }: {
      presentationId: string;
    }): Promise<{ success: boolean; slide?: any; error?: string }> => {
      return await googleAPIService.getGoogleSlide(
        presentationId,
        env.GOOGLE_MCP_SESSION_ID
      );
    },
  },
  // {
  //   name: "create_google_slide",
  //   description: "Create a new Google Slide (presentation).",
  //   inputSchema: z.object({
  //     slide: z.any(),
  //   }),
  //   handler: async ({
  //     slide,
  //   }: {
  //     slide: any;
  //   }): Promise<{ success: boolean; slide?: any; error?: string }> => {
  //     return await googleAPIService.createGoogleSlide(
  //       slide,
  //       env.GOOGLE_MCP_SESSION_ID
  //     );
  //   },
  // },
  // {
  //   name: "update_google_slide",
  //   description:
  //     "Update a Google Slide (presentation) using batchUpdate requests.",
  //   inputSchema: z.object({
  //     presentationId: z.string(),
  //     requests: z.array(z.any()),
  //   }),
  //   handler: async ({
  //     presentationId,
  //     requests,
  //   }: {
  //     presentationId: string;
  //     requests: any[];
  //   }): Promise<{ success: boolean; response?: any; error?: string }> => {
  //     return await googleAPIService.updateGoogleSlide(
  //       presentationId,
  //       requests,
  //       env.GOOGLE_MCP_SESSION_ID
  //     );
  //   },
  // },
  {
    name: "list_google_slides",
    description: "List all Google Slides (presentations).",
    inputSchema: z.object({
      random_string: z
        .string()
        .optional()
        .describe("Optional parameter to ensure tool can be called"),
    }),
    handler: async ({
      random_string,
    }: {
      random_string?: string;
    }): Promise<{
      success: boolean;
      slides?: any[];
      error?: string;
    }> => {
      return await googleAPIService.listGoogleSlides(env.GOOGLE_MCP_SESSION_ID);
    },
  },
  // {
  //   name: "delete_google_slide",
  //   description: "Delete a Google Slide (presentation) by ID.",
  //   inputSchema: z.object({
  //     presentationId: z.string(),
  //   }),
  //   handler: async ({
  //     presentationId,
  //   }: {
  //     presentationId: string;
  //   }): Promise<{ success: boolean; error?: string }> => {
  //     return await googleAPIService.deleteGoogleSlide(
  //       presentationId,
  //       env.GOOGLE_MCP_SESSION_ID
  //     );
  //   },
  // },
];
