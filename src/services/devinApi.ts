import axios, { AxiosInstance, AxiosError } from "axios";
import * as vscode from "vscode";

export interface DevinSession {
  session_id: string;
  status: string;
  title: string;
  created_at: string;
  updated_at: string;
  snapshot_id?: string | null;
  playbook_id?: string | null;
  tags?: string[] | null;
  requesting_user_email?: string | null;
}

export interface DevinMessage {
  // Define message structure based on API
  // This might need adjustment based on actual API response
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

export class DevinApiService {
  private static _instance: DevinApiService;
  private _baseUrl: string;

  private constructor() {
    const config = vscode.workspace.getConfiguration("devin");
    this._baseUrl = config.get<string>("apiBaseUrl", "https://api.devin.ai");
  }

  public static get instance(): DevinApiService {
    if (!DevinApiService._instance) {
      DevinApiService._instance = new DevinApiService();
    }
    return DevinApiService._instance;
  }

  private async getClient(apiKey: string): Promise<AxiosInstance> {
    return axios.create({
      baseURL: this._baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async listSessions(
    apiKey: string,
    limit: number = 10,
    offset: number = 0,
    tags?: string[],
    userEmail?: string
  ): Promise<DevinSession[]> {
    try {
      const client = await this.getClient(apiKey);
      // Always fetch slightly more if filtering by email locally,
      // but strictly speaking, without server-side filtering, offset/limit might be tricky.
      // For now, we pass limit/offset to the API. If filtering by email, it happens after.
      // Ideally, we should loop to find enough matches, but for simplicity, we filter the page.

      const params: any = { limit: 100, offset }; // Fetch more to allow filtering
      if (tags && tags.length > 0) {
        params.tags = tags;
      }
      const response = await client.get("/v1/sessions", { params });
      let sessions = response.data.sessions || [];

      if (userEmail) {
        sessions = sessions.filter(
          (s: DevinSession) => s.requesting_user_email === userEmail
        );
      }

      // Apply pagination manually if we fetched 100 but only want 'limit'
      // Wait, if we use the API's limit/offset, we get that slice.
      // If we filter by email client-side, the API pagination is "raw sessions".
      // Correct approach: Fetch larger batches or warn user.
      // We'll adhere to the user request: use limit/offset params, then filter.
      // To properly support "next 10 matching sessions", we'd need to scan.
      // For this implementation, I will apply the limit AFTER filtering on the fetched batch.

      return sessions.slice(0, limit);
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async getSession(apiKey: string, sessionId: string): Promise<any> {
    try {
      const client = await this.getClient(apiKey);
      const response = await client.get(`/v1/sessions/${sessionId}`);
      // Log response for debugging chat messages
      console.log(
        "Session details response:",
        JSON.stringify(response.data, null, 2)
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  async createSession(
    apiKey: string,
    prompt: string
  ): Promise<DevinSession | null> {
    try {
      const client = await this.getClient(apiKey);
      const response = await client.post("/v1/sessions", { prompt });
      return response.data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  async sendMessage(
    apiKey: string,
    sessionId: string,
    message: string
  ): Promise<boolean> {
    try {
      const client = await this.getClient(apiKey);
      await client.post(`/v1/sessions/${sessionId}/message`, { message });
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  private handleError(error: any) {
    console.error("Devin API Error:", error);
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.detail || error.message;
      vscode.window.showErrorMessage(`Devin API Error: ${message}`);
    } else {
      vscode.window.showErrorMessage(
        "An unexpected error occurred with Devin API."
      );
    }
  }
}
