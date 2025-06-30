import { google } from "googleapis";
import { env } from "@/app/config/env";
import { NextRequest, NextResponse } from "next/server";

// This page should only run on the server side
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const oauth2Client = new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: env.GOOGLE_SCOPES,
  });

  return NextResponse.redirect(authUrl);
}
