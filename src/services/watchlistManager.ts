import * as vscode from "vscode";

export class WatchlistManager {
  private static _instance: WatchlistManager;
  private _context: vscode.ExtensionContext;
  private readonly WATCHLIST_KEY = "devin.watchlist";

  private constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  public static init(context: vscode.ExtensionContext): void {
    WatchlistManager._instance = new WatchlistManager(context);
  }

  public static get instance(): WatchlistManager {
    if (!WatchlistManager._instance) {
      throw new Error("WatchlistManager not initialized");
    }
    return WatchlistManager._instance;
  }

  async getWatchlist(): Promise<string[]> {
    return this._context.globalState.get<string[]>(this.WATCHLIST_KEY, []);
  }

  async addToWatchlist(sessionId: string): Promise<void> {
    const watchlist = await this.getWatchlist();
    if (!watchlist.includes(sessionId)) {
      watchlist.push(sessionId);
      await this._context.globalState.update(this.WATCHLIST_KEY, watchlist);
    }
  }

  async removeFromWatchlist(sessionId: string): Promise<void> {
    const watchlist = await this.getWatchlist();
    const filtered = watchlist.filter((id) => id !== sessionId);
    await this._context.globalState.update(this.WATCHLIST_KEY, filtered);
  }

  async isInWatchlist(sessionId: string): Promise<boolean> {
    const watchlist = await this.getWatchlist();
    return watchlist.includes(sessionId);
  }
}
