# Experiment MCP: Google Workspace Tools

This project provides a set of MCP (Model-Connected Plugin) tools for interacting with Google Workspace services, including Gmail, Calendar, Drive, Docs, Sheets, and Slides.

## Features
- **Gmail**: Search, list labels, create/send drafts, reply, fetch messages/threads
- **Calendar**: List, create, update, delete events and calendars
- **Drive**: List, get, create, upload, download, and delete files
- **Docs, Sheets, Slides**: Read and list documents, spreadsheets, and presentations

## Setup
1. **Clone the repository**
2. **Install dependencies**
   - `npm install` or `pnpm install`
3. **Configure environment variables**
   - Set up your Google Cloud project and OAuth credentials
   - Ensure the following are set in your environment (e.g., `.env` or system env):
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_REDIRECT_URI`
     - `GOOGLE_MCP_SESSION_ID`
     - `REDIS_URL`
     - `GOOGLE_SCOPES`

    - Ensure your credentials have the required scopes for Gmail, Calendar, Drive, Docs, Sheets, and Slides APIs
        - Docs, Sheets and Slides only need a readonly scope
4. **Run the server**
   - Start your MCP server as per your deployment or local setup

## Tool Registration
- Tools are defined in `app/tools/` and registered in `app/[transport]/route.ts`.
- By default, Gmail, Calendar, and Drive tools are fully supported (read/write/delete).
- **Docs, Sheets, and Slides tools are supported in read-only mode (get/list) due to platform limitations.**

## Platform Limitations (IMPORTANT)
- **Docs, Sheets, and Slides tools:**
  - Only `get` and `list` operations are supported.
  - Any attempt to register `create`, `update`, or `delete` tools for Docs, Sheets, or Slides will cause the chat/model to return errors or block tool usage.
  - This is a platform-level restriction (e.g., Cursor or MCP adapter) for security and risk management reasons.
  - Gmail, Calendar, and Drive tools (including write/delete) are not affected.

## Troubleshooting
- If you encounter errors when enabling Docs, Sheets, or Slides tools, ensure only the read/list tools are registered.
- Check your environment variables and Google API credentials for correct scopes and validity.
- For further issues, consult platform documentation or support (e.g., Cursor, MCP adapter).


## License
MIT
