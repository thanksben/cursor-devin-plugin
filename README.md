# Devin Sessions - AI Coding Assistant

Integrate Devin AI sessions directly into your editor. View, manage, and interact with your Devin sessions without leaving your code. Works with VS Code, Cursor, Antigravity, and other compatible editors.

## Features

- **List Sessions**: View all your Devin sessions with status, timestamps, and pull request links
- **Filter & Pagination**: Filter sessions locally and paginate through results (10 per page)
- **My Sessions**: Filter sessions by your email to see only sessions you created
- **Chat Interface**: View full chat history with Markdown and syntax highlighting support
- **Live Status Indicator**: See whether Devin is working, waiting for you, or finished — right in the chat header
- **Real-time Updates**: Messages auto-refresh every 5 seconds
- **Send Messages**: Communicate with Devin directly from the chat view (suspended sessions resume automatically)
- **Create Sessions**: Start new Devin sessions with a single click
- **Pull Request Links**: Quick access to PRs (with their state) associated with sessions
- **Session Cost**: See ACUs consumed per session in the chat header
- **Open in Devin**: Jump to the session on app.devin.ai from the chat header
- **Secure Storage**: API key, organization ID, and email stored securely using VSCode's Secret Storage (OS keychain)

> This extension uses the Devin **API v3**, which requires a service user API key (prefix `cog_`) and your organization ID (prefix `org-`). Legacy `apk_` keys from the deprecated v1 API will not work.

## Installation & Setup

### Step 1: Create a Service User and Get Your API Key

The v3 API authenticates with **service users** instead of personal API keys:

1. In the Devin web app, go to **Settings > Devin API > Service users** (URL looks like `https://app.devin.ai/org/<your-org-slug>/settings/devin-api?tab=service-users`)
2. Click **Provision** to create a service user with **Organization** scope, and assign it a role with at least these permissions:
   - `ViewOrgSessions` — list sessions and read chat history
   - `ManageOrgSessions` — create sessions, send messages, terminate
   - `ViewOrgMembership` (optional) — enables the "Show My Sessions Only" email filter
   - `ImpersonateOrgSessions` (optional) — attributes sessions you create to your own user account instead of the service user
3. Generate an API key for the service user — it starts with `cog_` and is **shown only once**, so copy it immediately

> ⚠️ Keys from the "Legacy API" tab (prefix `apk_` or `apk_user_`) do **not** work with this extension — they only work with the deprecated v1/v2 APIs.

### Step 1b: Find Your Organization ID

The extension needs your organization ID with the `org-` prefix (e.g. `org-b3f7...`). This is **not** the org name/slug that appears in the web app URL (`/org/your-org-slug/...`).

If it's not displayed on the Service users page, use one of these methods:

- **Browser DevTools (most reliable)**: on any app.devin.ai page, open DevTools (`Cmd+Option+I`) → **Network** tab → refresh the page → filter for `organizations`. The web app's own API calls contain your ID in the URL path: `/organizations/org-.../`
- **Service user details**: click a service user row or open the key-creation dialog — the example `curl` snippet includes `/v3/organizations/org-.../`
- **API (enterprise-scoped keys only)**: `curl -H "Authorization: Bearer cog_YOUR_KEY" https://api.devin.ai/v3/enterprise/organizations` lists all orgs with their IDs

To verify you have the right value:

```bash
curl -H "Authorization: Bearer cog_YOUR_KEY" \
  "https://api.devin.ai/v3/organizations/YOUR_ORG_ID/sessions?first=1"
```

A correct org ID returns JSON with an `items` array; a wrong one returns a 403/404.

### Step 2: Install the Extension

#### Option A: Run in Development Mode (Recommended for Testing)

1. Clone this repository
2. Open the project in Cursor/VSCode
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the extension:
   ```bash
   npm run compile
   ```
5. Press `F5` to launch the Extension Development Host

#### Option B: Install from VSIX Package

1. Build the extension package:
   ```bash
   npm install -g @vscode/vsce
   vsce package
   ```
2. Install the `.vsix` file:
   - Open Cursor/VSCode
   - Press `Cmd+Shift+X` (Extensions view)
   - Click the "..." menu → "Install from VSIX..."
   - Select `devin-cursor-plugin-0.0.2.vsix`

### Step 3: Configure the Extension

After installing the extension, follow these steps to set it up:

1. **Set Your API Key** (Required):

   - Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type and select: `Devin: Set API Key`
   - Paste your service user API key (`cog_...`) from Step 1
   - You should see: "Devin API Key saved successfully."

2. **Set Your Organization ID** (Required):

   - Open Command Palette: `Cmd+Shift+P`
   - Type and select: `Devin: Set Organization ID`
   - Paste your organization ID (`org-...`) from Step 1b

3. **Set Your Email** (Optional - for filtering):

   - Open Command Palette: `Cmd+Shift+P`
   - Type and select: `Devin: Set User Email`
   - Enter your email address (the one associated with your Devin account)
   - This enables the "Show My Sessions Only" toggle in the UI (requires the `ViewOrgMembership` permission on the service user)

4. **Open Devin Sessions**:
   - Open Command Palette: `Cmd+Shift+P`
   - Type and select: `Devin: Open Sessions`
   - The Devin Sessions panel will open showing your sessions

## Usage

### Session List View

- **Filter**: Use the search box to filter sessions by title or status
- **My Sessions Toggle**: If you've set your email, toggle "Show My Sessions Only" to filter by your sessions
- **Create Session**: Enter a prompt and click "+ Create" to start a new Devin session
- **Pagination**: Navigate through sessions using "Previous" and "Next" buttons
- **PR Links**: Click the "PR" button to open associated pull requests in your browser
- **View Chat**: Click on any session row to open the chat view

### Chat View

- **View Messages**: See the full conversation history with Markdown rendering
- **Auto-Refresh**: Messages update automatically every 5 seconds
- **Send Messages**: Type your message and press Enter (or click "Send")
- **Smart Scroll**: The view auto-scrolls to new messages only when you're at the bottom
- **Back Button**: Return to the session list

## Commands

Access these via Command Palette (`Cmd+Shift+P`):

- **`Devin: Open Sessions`**: Open the main Devin Sessions panel
- **`Devin: Set API Key`**: Set or update your Devin service user API key (`cog_...`)
- **`Devin: Set Organization ID`**: Set your Devin organization ID (`org-...`)
- **`Devin: Set User Email`**: Set your email for session filtering

## Configuration

You can configure the following in VSCode settings:

- `devin.apiBaseUrl`: Base URL for the Devin API (default: `https://api.devin.ai`)

## Security

- Your API key is stored securely using VSCode's `SecretStorage` API, which leverages your operating system's keychain (Keychain Access on macOS, Windows Credential Manager, or libsecret on Linux)
- The API key is never saved in plain text configuration files
- Your organization ID and email preference are also stored securely
- Grant your service user only the permissions the extension needs (least privilege)

## Development

### Build Commands

- `npm run compile`: Build the extension (development mode)
- `npm run watch`: Build and watch for changes
- `npm run package`: Build for production
- `vsce package`: Create a `.vsix` installation package

### Debugging

Press `F5` in VSCode to launch the Extension Development Host with the extension loaded.

## Troubleshooting

**No sessions showing up?**

- Verify your API key is a service user key (`cog_...`): Run `Devin: Set API Key` again — legacy `apk_` keys do not work with the v3 API
- Verify your organization ID (`org-...`): Run `Devin: Set Organization ID` — note this is NOT the org slug from the web app URL (see "Find Your Organization ID" above)
- Check the service user's role has `ViewOrgSessions`
- Check the Developer Console: `Cmd+Option+I` in the Extension Development Host

**401 Unauthorized errors?**

- You are likely using a legacy `apk_` key. Create a service user key under Settings > Service Users

**403 Forbidden errors?**

- Your service user's role is missing a permission (see Step 1 of the setup)

**"Show My Sessions Only" toggle not appearing?**

- Make sure you've set your email via `Devin: Set User Email`
- The service user needs the `ViewOrgMembership` permission to resolve your email to a user ID

## API Reference

This plugin uses the Devin API v3:

- [List Sessions](https://docs.devin.ai/api-reference/v3/sessions/organizations-sessions)
- [Get Session](https://docs.devin.ai/api-reference/v3/sessions/get-organizations-session)
- [List Session Messages](https://docs.devin.ai/api-reference/v3/sessions/get-organizations-session-messages)
- [Create Session](https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions)
- [Send Message](https://docs.devin.ai/api-reference/v3/sessions/post-organizations-sessions-messages)
- [Terminate Session](https://docs.devin.ai/api-reference/v3/sessions/delete-organizations-sessions)
- [Authentication](https://docs.devin.ai/api-reference/authentication)

## License

See LICENSE file for details.
