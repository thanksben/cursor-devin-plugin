import * as vscode from "vscode";
import { SecretStorageManager } from "./services/secretStorage";
import { DevinApiService } from "./services/devinApi";
import { WatchlistManager } from "./services/watchlistManager";

export function activate(context: vscode.ExtensionContext) {
  // Initialize Secret Storage and Watchlist
  SecretStorageManager.init(context);
  WatchlistManager.init(context);

  // Register command to set API Key
  context.subscriptions.push(
    vscode.commands.registerCommand("devin.setApiKey", async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt:
          'Enter your Devin service user API key (prefix "cog_", from Settings > Service Users)',
        password: true,
        ignoreFocusOut: true,
        placeHolder: "cog_...",
      });

      if (apiKey) {
        await SecretStorageManager.instance.setApiKey(apiKey);
        vscode.window.showInformationMessage(
          "Devin API Key saved successfully."
        );
      }
    })
  );

  // Register command to set Organization ID (required by the v3 API)
  context.subscriptions.push(
    vscode.commands.registerCommand("devin.setOrgId", async () => {
      const orgId = await vscode.window.showInputBox({
        prompt:
          "Enter your Devin organization ID (shown on Settings > Service Users)",
        ignoreFocusOut: true,
        placeHolder: "org-...",
        validateInput: (value) =>
          value && !value.startsWith("org-")
            ? 'Organization IDs start with "org-"'
            : undefined,
      });

      if (orgId) {
        await SecretStorageManager.instance.setOrgId(orgId);
        vscode.window.showInformationMessage(
          "Devin Organization ID saved successfully."
        );
      }
    })
  );

  // Register command to set User Email
  context.subscriptions.push(
    vscode.commands.registerCommand("devin.setUserEmail", async () => {
      const email = await vscode.window.showInputBox({
        prompt: "Enter your email to filter sessions (optional)",
        ignoreFocusOut: true,
        placeHolder: "user@example.com",
      });

      if (email !== undefined) {
        await SecretStorageManager.instance.setUserEmail(email);
        vscode.window.showInformationMessage(
          email
            ? `Devin User Email set to ${email}`
            : "Devin User Email cleared."
        );
      }
    })
  );

  // Register command to open sessions
  context.subscriptions.push(
    vscode.commands.registerCommand("devin.openSessions", () => {
      DevinPanel.createOrShow(context.extensionUri);
    })
  );
}

class DevinPanel {
  public static currentPanel: DevinPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        const apiKey = await SecretStorageManager.instance.getApiKey();

        if (!apiKey) {
          vscode.window.showErrorMessage(
            'Devin API Key not found. The v3 API requires a service user key (prefix "cog_") — create one under Settings > Service Users, then run "Devin: Set API Key".'
          );
          return;
        }

        const orgId = await SecretStorageManager.instance.getOrgId();

        if (!orgId) {
          vscode.window.showErrorMessage(
            'Devin Organization ID not found. Find it on Settings > Service Users (prefix "org-"), then run "Devin: Set Organization ID".'
          );
          return;
        }

        switch (message.type) {
          case "checkEmailStatus":
            this._checkEmailStatus(apiKey, orgId);
            break;
          case "listSessions":
            this._listSessions(apiKey, orgId, message);
            break;
          case "getSession":
            this._getSession(apiKey, orgId, message.sessionId);
            break;
          case "createSession":
            this._createSession(apiKey, orgId, message.prompt);
            break;
          case "sendMessage":
            this._sendMessage(
              apiKey,
              orgId,
              message.sessionId,
              message.message
            );
            break;
          case "stopSession":
            this._stopSession(apiKey, orgId, message.sessionId);
            break;
          case "openLink":
            if (message.url) {
              vscode.env.openExternal(vscode.Uri.parse(message.url));
            }
            break;
          case "getWatchlist":
            this._getWatchlist();
            break;
          case "addToWatchlist":
            this._addToWatchlist(message.sessionId);
            break;
          case "removeFromWatchlist":
            this._removeFromWatchlist(message.sessionId);
            break;
          case "isInWatchlist":
            this._isInWatchlist(message.sessionId);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DevinPanel.currentPanel) {
      DevinPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "devinSessions",
      "Devin Sessions",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist")],
        retainContextWhenHidden: true,
      }
    );

    DevinPanel.currentPanel = new DevinPanel(panel, extensionUri);
  }

  public dispose() {
    DevinPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  /**
   * The email filter only works when the stored email resolves to a v3
   * user_id (requires the ViewOrgMembership permission on the service user).
   */
  private async _resolveMyUserId(
    apiKey: string,
    orgId: string
  ): Promise<string | null> {
    const email = await SecretStorageManager.instance.getUserEmail();
    if (!email) {
      return null;
    }
    return DevinApiService.instance.resolveUserIdByEmail(apiKey, orgId, email);
  }

  private async _checkEmailStatus(apiKey: string, orgId: string) {
    const userId = await this._resolveMyUserId(apiKey, orgId);
    this._panel.webview.postMessage({
      type: "emailStatusResponse",
      emailSet: !!userId,
    });
  }

  private async _listSessions(apiKey: string, orgId: string, params: any) {
    try {
      let userIds: string[] | undefined;
      if (params.mySessions) {
        const userId = await this._resolveMyUserId(apiKey, orgId);
        if (userId) {
          userIds = [userId];
        }
      }

      if (params.isSearch) {
        const sessions = await DevinApiService.instance.listAllSessions(
          apiKey,
          orgId,
          params.limit || 600,
          userIds
        );
        this._panel.webview.postMessage({
          type: "sessionsResponse",
          sessions,
          isSearch: true,
        });
        return;
      }

      const page = await DevinApiService.instance.listSessions(
        apiKey,
        orgId,
        params.limit || 10,
        params.after || null,
        params.tags,
        userIds
      );
      this._panel.webview.postMessage({
        type: "sessionsResponse",
        sessions: page.items,
        endCursor: page.endCursor,
        hasNextPage: page.hasNextPage,
        isSearch: false,
      });
    } catch (e) {
      vscode.window.showErrorMessage("Failed to list sessions");
    }
  }

  private async _getSession(apiKey: string, orgId: string, sessionId: string) {
    try {
      const [session, messages] = await Promise.all([
        DevinApiService.instance.getSession(apiKey, orgId, sessionId),
        DevinApiService.instance.getSessionMessages(apiKey, orgId, sessionId),
      ]);
      if (session) {
        this._panel.webview.postMessage({
          type: "sessionDetailsResponse",
          sessionId,
          session,
          messages,
        });
      }
    } catch (e) {
      vscode.window.showErrorMessage("Failed to get session details");
    }
  }

  private async _createSession(apiKey: string, orgId: string, prompt: string) {
    try {
      // Attribute the session to the user when possible (needs
      // ImpersonateOrgSessions; the API client falls back on 403).
      const userId = await this._resolveMyUserId(apiKey, orgId);
      const session = await DevinApiService.instance.createSession(
        apiKey,
        orgId,
        prompt,
        userId ?? undefined
      );
      if (session) {
        vscode.window.showInformationMessage(
          `Session created: ${session.title || session.session_id}`
        );
        this._panel.webview.postMessage({ type: "sessionCreated", session });
      }
    } catch (e) {
      vscode.window.showErrorMessage("Failed to create session");
    }
  }

  private async _sendMessage(
    apiKey: string,
    orgId: string,
    sessionId: string,
    message: string
  ) {
    try {
      const success = await DevinApiService.instance.sendMessage(
        apiKey,
        orgId,
        sessionId,
        message
      );
      if (success) {
        this._panel.webview.postMessage({ type: "messageSent", sessionId });
      }
    } catch (e) {
      vscode.window.showErrorMessage("Failed to send message");
    }
  }

  private async _stopSession(apiKey: string, orgId: string, sessionId: string) {
    try {
      const session = await DevinApiService.instance.stopSession(
        apiKey,
        orgId,
        sessionId
      );
      if (session) {
        vscode.window.showInformationMessage("Session terminated successfully");
        this._panel.webview.postMessage({
          type: "sessionStopped",
          sessionId,
          session,
        });
      }
    } catch (e) {
      vscode.window.showErrorMessage("Failed to terminate session");
    }
  }

  private async _getWatchlist() {
    try {
      const watchlist = await WatchlistManager.instance.getWatchlist();
      this._panel.webview.postMessage({ type: "watchlistResponse", watchlist });
    } catch (e) {
      vscode.window.showErrorMessage("Failed to get watchlist");
    }
  }

  private async _addToWatchlist(sessionId: string) {
    try {
      await WatchlistManager.instance.addToWatchlist(sessionId);
      const watchlist = await WatchlistManager.instance.getWatchlist();
      this._panel.webview.postMessage({ type: "watchlistResponse", watchlist });
      vscode.window.showInformationMessage("Session added to watchlist");
    } catch (e) {
      vscode.window.showErrorMessage("Failed to add to watchlist");
    }
  }

  private async _removeFromWatchlist(sessionId: string) {
    try {
      await WatchlistManager.instance.removeFromWatchlist(sessionId);
      const watchlist = await WatchlistManager.instance.getWatchlist();
      this._panel.webview.postMessage({ type: "watchlistResponse", watchlist });
      vscode.window.showInformationMessage("Session removed from watchlist");
    } catch (e) {
      vscode.window.showErrorMessage("Failed to remove from watchlist");
    }
  }

  private async _isInWatchlist(sessionId: string) {
    try {
      const isInWatchlist = await WatchlistManager.instance.isInWatchlist(
        sessionId
      );
      this._panel.webview.postMessage({
        type: "isInWatchlistResponse",
        sessionId,
        isInWatchlist,
      });
    } catch (e) {
      vscode.window.showErrorMessage("Failed to check watchlist");
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.title = "Devin Sessions";
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const scriptPathOnDisk = vscode.Uri.joinPath(
      this._extensionUri,
      "dist",
      "webview.js"
    );
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Devin Sessions</title>
			</head>
			<body>
				<div id="root"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
