import * as vscode from "vscode";
import { SecretStorageManager } from "./services/secretStorage";
import { DevinApiService } from "./services/devinApi";

export function activate(context: vscode.ExtensionContext) {
  // Initialize Secret Storage
  SecretStorageManager.init(context);

  // Register command to set API Key
  context.subscriptions.push(
    vscode.commands.registerCommand("devin.setApiKey", async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: "Enter your Devin API Key",
        password: true,
        ignoreFocusOut: true,
      });

      if (apiKey) {
        await SecretStorageManager.instance.setApiKey(apiKey);
        vscode.window.showInformationMessage(
          "Devin API Key saved successfully."
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
            'Devin API Key not found. Please run "Devin: Set API Key" command.'
          );
          return;
        }

        switch (message.type) {
          case "checkEmailStatus":
            const email = await SecretStorageManager.instance.getUserEmail();
            this._panel.webview.postMessage({
              type: "emailStatusResponse",
              emailSet: !!email,
            });
            break;
          case "listSessions":
            this._listSessions(apiKey, message);
            break;
          case "getSession":
            this._getSession(apiKey, message.sessionId);
            break;
          case "createSession":
            this._createSession(apiKey, message.prompt);
            break;
          case "sendMessage":
            this._sendMessage(apiKey, message.sessionId, message.message);
            break;
          case "openLink":
            if (message.url) {
              vscode.env.openExternal(vscode.Uri.parse(message.url));
            }
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
        retainContextWhenHidden: true, // Keep state when switching tabs
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

  private async _listSessions(apiKey: string, params: any) {
    try {
      const userEmail = await SecretStorageManager.instance.getUserEmail();
      // Only use email for filtering if it exists AND mySessions is true (or undefined, assuming default)
      // If mySessions is explicitly false, pass undefined to listSessions
      const filterEmail = params.mySessions !== false ? userEmail : undefined;

      const sessions = await DevinApiService.instance.listSessions(
        apiKey,
        params.limit || 10,
        params.offset || 0,
        params.tags,
        filterEmail
      );
      this._panel.webview.postMessage({
        type: "sessionsResponse",
        sessions,
        total: sessions.length,
      });
    } catch (e) {
      vscode.window.showErrorMessage("Failed to list sessions");
    }
  }

  private async _getSession(apiKey: string, sessionId: string) {
    try {
      const session = await DevinApiService.instance.getSession(
        apiKey,
        sessionId
      );
      if (session) {
        this._panel.webview.postMessage({
          type: "sessionDetailsResponse",
          sessionId,
          session,
        });
      }
    } catch (e) {
      vscode.window.showErrorMessage("Failed to get session details");
    }
  }

  private async _createSession(apiKey: string, prompt: string) {
    try {
      const session = await DevinApiService.instance.createSession(
        apiKey,
        prompt
      );
      if (session) {
        vscode.window.showInformationMessage(
          `Session created: ${session.title}`
        );
        this._panel.webview.postMessage({ type: "sessionCreated", session });
      }
    } catch (e) {
      vscode.window.showErrorMessage("Failed to create session");
    }
  }

  private async _sendMessage(
    apiKey: string,
    sessionId: string,
    message: string
  ) {
    try {
      const success = await DevinApiService.instance.sendMessage(
        apiKey,
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
