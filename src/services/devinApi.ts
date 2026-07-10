import axios, { AxiosInstance } from "axios";
import * as vscode from "vscode";

// Shapes verified against the v3 OpenAPI spec:
// https://docs.devin.ai/api-reference/v3/sessions/get-organizations-session

export interface SessionPullRequest {
  pr_url: string;
  pr_state: string | null;
}

export interface DevinSession {
  session_id: string;
  url: string;
  status:
    | "new"
    | "claimed"
    | "running"
    | "exit"
    | "error"
    | "suspended"
    | "resuming"
    | string;
  status_detail?: string | null;
  title?: string | null;
  created_at: number;
  updated_at: number;
  user_id?: string | null;
  service_user_id?: string | null;
  acus_consumed: number;
  pull_requests: SessionPullRequest[];
  tags: string[];
  is_archived?: boolean;
  structured_output?: Record<string, unknown> | null;
}

export interface SessionMessage {
  event_id: string;
  source: "devin" | "user";
  message: string;
  created_at: number;
}

export interface Paginated<T> {
  items: T[];
  end_cursor?: string | null;
  has_next_page?: boolean;
  total?: number | null;
}

export interface SessionPage {
  items: DevinSession[];
  endCursor: string | null;
  hasNextPage: boolean;
}

const MESSAGE_PAGE_LIMIT = 200;
const MAX_MESSAGE_PAGES = 20;

export class DevinApiService {
  private static _instance: DevinApiService;
  private _baseUrl: string;
  private _userIdCache = new Map<string, string | null>();

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

  private getClient(apiKey: string): AxiosInstance {
    return axios.create({
      baseURL: this._baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // FastAPI expects repeated query params (tags=a&tags=b), not tags[]=a
      paramsSerializer: { indexes: null },
    });
  }

  private orgPath(orgId: string, path: string): string {
    return `/v3/organizations/${encodeURIComponent(orgId)}${path}`;
  }

  async listSessions(
    apiKey: string,
    orgId: string,
    first: number = 10,
    after?: string | null,
    tags?: string[],
    userIds?: string[]
  ): Promise<SessionPage> {
    try {
      const client = this.getClient(apiKey);
      const params: Record<string, unknown> = { first };
      if (after) {
        params.after = after;
      }
      if (tags && tags.length > 0) {
        params.tags = tags;
      }
      if (userIds && userIds.length > 0) {
        params.user_ids = userIds;
      }
      const response = await client.get<Paginated<DevinSession>>(
        this.orgPath(orgId, "/sessions"),
        { params }
      );
      return {
        items: response.data.items || [],
        endCursor: response.data.end_cursor ?? null,
        hasNextPage: response.data.has_next_page ?? false,
      };
    } catch (error) {
      this.handleError(error);
      return { items: [], endCursor: null, hasNextPage: false };
    }
  }

  /**
   * Fetch up to `max` sessions by following cursors (v3 caps pages at 200).
   * Used for the client-side search corpus.
   */
  async listAllSessions(
    apiKey: string,
    orgId: string,
    max: number = 600,
    userIds?: string[]
  ): Promise<DevinSession[]> {
    const all: DevinSession[] = [];
    let after: string | null = null;
    while (all.length < max) {
      const pageSize = Math.min(200, max - all.length);
      const page = await this.listSessions(
        apiKey,
        orgId,
        pageSize,
        after,
        undefined,
        userIds
      );
      all.push(...page.items);
      if (!page.hasNextPage || !page.endCursor) {
        break;
      }
      after = page.endCursor;
    }
    return all;
  }

  async getSession(
    apiKey: string,
    orgId: string,
    devinId: string
  ): Promise<DevinSession | null> {
    try {
      const client = this.getClient(apiKey);
      const response = await client.get<DevinSession>(
        this.orgPath(orgId, `/sessions/${encodeURIComponent(devinId)}`)
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Fetch the full chat history, following cursors (chronological order).
   */
  async getSessionMessages(
    apiKey: string,
    orgId: string,
    devinId: string
  ): Promise<SessionMessage[]> {
    try {
      const client = this.getClient(apiKey);
      const messages: SessionMessage[] = [];
      let after: string | null = null;
      for (let page = 0; page < MAX_MESSAGE_PAGES; page++) {
        const params: Record<string, unknown> = { first: MESSAGE_PAGE_LIMIT };
        if (after) {
          params.after = after;
        }
        const response = await client.get<Paginated<SessionMessage>>(
          this.orgPath(
            orgId,
            `/sessions/${encodeURIComponent(devinId)}/messages`
          ),
          { params }
        );
        messages.push(...(response.data.items || []));
        if (!response.data.has_next_page || !response.data.end_cursor) {
          break;
        }
        after = response.data.end_cursor;
      }
      return messages;
    } catch (error) {
      this.handleError(error);
      return [];
    }
  }

  async createSession(
    apiKey: string,
    orgId: string,
    prompt: string,
    createAsUserId?: string
  ): Promise<DevinSession | null> {
    const client = this.getClient(apiKey);
    const path = this.orgPath(orgId, "/sessions");
    if (createAsUserId) {
      try {
        const response = await client.post<DevinSession>(path, {
          prompt,
          create_as_user_id: createAsUserId,
        });
        return response.data;
      } catch (error) {
        // Impersonation needs ImpersonateOrgSessions; fall back to creating
        // the session as the service user itself.
        if (!axios.isAxiosError(error) || error.response?.status !== 403) {
          this.handleError(error);
          return null;
        }
      }
    }
    try {
      const response = await client.post<DevinSession>(path, { prompt });
      return response.data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  async sendMessage(
    apiKey: string,
    orgId: string,
    devinId: string,
    message: string
  ): Promise<boolean> {
    try {
      const client = this.getClient(apiKey);
      await client.post(
        this.orgPath(
          orgId,
          `/sessions/${encodeURIComponent(devinId)}/messages`
        ),
        { message }
      );
      return true;
    } catch (error) {
      this.handleError(error);
      return false;
    }
  }

  async stopSession(
    apiKey: string,
    orgId: string,
    devinId: string,
    archive: boolean = false
  ): Promise<DevinSession | null> {
    try {
      const client = this.getClient(apiKey);
      const response = await client.delete<DevinSession>(
        this.orgPath(orgId, `/sessions/${encodeURIComponent(devinId)}`),
        { params: { archive } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
      return null;
    }
  }

  /**
   * Resolve a user email to a v3 user_id via the beta members endpoint.
   * Requires ViewOrgMembership; returns null (silently) when unavailable
   * so callers can degrade gracefully.
   */
  async resolveUserIdByEmail(
    apiKey: string,
    orgId: string,
    email: string
  ): Promise<string | null> {
    const cacheKey = `${orgId}:${email.toLowerCase()}`;
    if (this._userIdCache.has(cacheKey)) {
      return this._userIdCache.get(cacheKey) ?? null;
    }
    try {
      const client = this.getClient(apiKey);
      const response = await client.get<
        Paginated<{ user_id: string; email: string | null }>
      >(
        `/v3beta1/organizations/${encodeURIComponent(orgId)}/members/users`,
        { params: { email, first: 1 } }
      );
      const userId = response.data.items?.[0]?.user_id ?? null;
      this._userIdCache.set(cacheKey, userId);
      return userId;
    } catch (error) {
      // Missing ViewOrgMembership permission or endpoint unavailable —
      // don't surface an error, the email filter just becomes unavailable.
      console.warn("Devin API: could not resolve user id from email", error);
      this._userIdCache.set(cacheKey, null);
      return null;
    }
  }

  private handleError(error: unknown) {
    console.error("Devin API Error:", error);
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const rawDetail = error.response?.data?.detail;
      const detail =
        typeof rawDetail === "string" ? rawDetail : error.message;
      let hint = "";
      if (status === 401) {
        hint =
          ' The v3 API requires a service user API key (prefix "cog_"). Create one under Settings > Service Users and run "Devin: Set API Key".';
      } else if (status === 403) {
        hint =
          " Your service user may be missing a permission (ViewOrgSessions / ManageOrgSessions).";
      } else if (status === 404) {
        hint =
          ' Check your organization ID (prefix "org-") via "Devin: Set Organization ID".';
      }
      vscode.window.showErrorMessage(`Devin API Error: ${detail}.${hint}`);
    } else {
      vscode.window.showErrorMessage(
        "An unexpected error occurred with Devin API."
      );
    }
  }
}
