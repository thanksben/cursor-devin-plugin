# Devin Cursor Plugin

Integrate Devin AI sessions directly into your Cursor/VSCode workflow. View, manage, and interact with your Devin sessions without leaving your code editor.

## Features

- **List Sessions**: View all your Devin sessions with status, timestamps, and pull request links
- **Filter & Pagination**: Filter sessions locally and paginate through results (10 per page)
- **My Sessions**: Filter sessions by your email to see only sessions you created
- **Chat Interface**: View full chat history with Markdown and syntax highlighting support
- **Real-time Updates**: Messages auto-refresh every 5 seconds
- **Send Messages**: Communicate with Devin directly from the chat view
- **Create Sessions**: Start new Devin sessions with a single click
- **Pull Request Links**: Quick access to PRs associated with sessions
- **Secure Storage**: API Key and email stored securely using VSCode's Secret Storage (OS keychain)

## Installation & Setup

### Step 1: Get Your Devin API Key

1. Navigate to [https://app.devin.ai/settings/api-keys](https://app.devin.ai/settings/api-keys)
2. Click "Create New API Key" or copy an existing key
3. Save the key somewhere temporarily (you'll paste it in the next step)

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
   - Paste your API key from Step 1
   - You should see: "Devin API Key saved successfully."

2. **Set Your Email** (Optional - for filtering):

   - Open Command Palette: `Cmd+Shift+P`
   - Type and select: `Devin: Set User Email`
   - Enter your email address (the one associated with your Devin account)
   - This enables the "Show My Sessions Only" toggle in the UI

3. **Open Devin Sessions**:
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
- **`Devin: Set API Key`**: Set or update your Devin API key
- **`Devin: Set User Email`**: Set your email for session filtering

## Configuration

You can configure the following in VSCode settings:

- `devin.apiBaseUrl`: Base URL for the Devin API (default: `https://api.devin.ai`)

## Security

- Your API key is stored securely using VSCode's `SecretStorage` API, which leverages your operating system's keychain (Keychain Access on macOS, Windows Credential Manager, or libsecret on Linux)
- The API key is never saved in plain text configuration files
- Your email preference is also stored securely

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

- Verify your API key is correct: Run `Devin: Set API Key` again
- Check the Developer Console: `Cmd+Option+I` in the Extension Development Host

**Messages not displaying?**

- Check the webview console logs for API response structure
- The plugin expects messages in the format returned by `/v1/sessions/{session_id}`

**"Show My Sessions Only" toggle not appearing?**

- Make sure you've set your email via `Devin: Set User Email`

## API Reference

This plugin uses the Devin API:

- [List Sessions](https://docs.devin.ai/api-reference/sessions/list-sessions)
- [Session Details](https://docs.devin.ai/api-reference/sessions/retrieve-details-about-an-existing-session)
- [Create Session](https://docs.devin.ai/api-reference/sessions/create-a-new-devin-session)
- [Send Message](https://docs.devin.ai/api-reference/sessions/send-a-message-to-an-existing-devin-session)

## License

See LICENSE file for details.
