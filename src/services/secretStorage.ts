import * as vscode from "vscode";

export class SecretStorageManager {
  private static _instance: SecretStorageManager;
  private _secretStorage: vscode.SecretStorage;

  private constructor(context: vscode.ExtensionContext) {
    this._secretStorage = context.secrets;
  }

  public static init(context: vscode.ExtensionContext): void {
    SecretStorageManager._instance = new SecretStorageManager(context);
  }

  public static get instance(): SecretStorageManager {
    if (!SecretStorageManager._instance) {
      throw new Error("SecretStorageManager not initialized");
    }
    return SecretStorageManager._instance;
  }

  async getApiKey(): Promise<string | undefined> {
    return await this._secretStorage.get("devin.apiKey");
  }

  async setApiKey(apiKey: string): Promise<void> {
    await this._secretStorage.store("devin.apiKey", apiKey);
  }

  async deleteApiKey(): Promise<void> {
    await this._secretStorage.delete("devin.apiKey");
  }

  async getUserEmail(): Promise<string | undefined> {
    return await this._secretStorage.get("devin.userEmail");
  }

  async setUserEmail(email: string): Promise<void> {
    await this._secretStorage.store("devin.userEmail", email);
  }
}
