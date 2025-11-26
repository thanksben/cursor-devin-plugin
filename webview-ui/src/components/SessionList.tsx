import React, { useEffect, useState, useRef, useCallback } from "react";
import { vscode } from "../utilities/vscode";
import StatusBadge from "./common/StatusBadge";
import {
  VSCodeButton,
  VSCodeDataGrid,
  VSCodeDataGridCell,
  VSCodeDataGridRow,
  VSCodeTextField,
  VSCodeProgressRing,
  VSCodeCheckbox,
} from "@vscode/webview-ui-toolkit/react";

interface Session {
  session_id: string;
  title: string;
  status: string;
  updated_at: string;
  requesting_user_email?: string;
  pull_request?: {
    url: string;
  };
}

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
}

const SEARCH_LIMIT = 1000; // Fetch up to 1000 sessions when searching
const PAGE_LIMIT = 10;
const DEBOUNCE_MS = 300; // Debounce search input

const SessionList: React.FC<SessionListProps> = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [searchSessions, setSearchSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [newSessionPrompt, setNewSessionPrompt] = useState("");
  const [offset, setOffset] = useState(0);
  const [emailSet, setEmailSet] = useState(false);
  const [showMySessions, setShowMySessions] = useState(false);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchSessionsFetched = useRef(false); // Track if we've already fetched search data

  const fetchSessions = (currentOffset: number, mySessions: boolean) => {
    setLoading(true);
    vscode.postMessage({
      type: "listSessions",
      limit: PAGE_LIMIT,
      offset: currentOffset,
      mySessions,
    });
  };

  const fetchSearchSessions = useCallback(
    (mySessions: boolean) => {
      // Only fetch if we haven't already fetched search sessions
      if (searchSessionsFetched.current && searchSessions.length > 0) {
        return;
      }
      setSearchLoading(true);
      searchSessionsFetched.current = true;
      vscode.postMessage({
        type: "listSessions",
        limit: SEARCH_LIMIT,
        offset: 0,
        mySessions,
        isSearch: true, // Flag to identify search requests
      });
    },
    [searchSessions.length]
  );

  // Handle filter input with debounce for entering search mode
  const handleFilterInput = (value: string) => {
    setFilter(value);

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim()) {
      // Enter search mode and fetch data only once
      if (!isSearchMode) {
        debounceTimerRef.current = setTimeout(() => {
          setIsSearchMode(true);
          fetchSearchSessions(showMySessions);
        }, DEBOUNCE_MS);
      }
      // If already in search mode, just filter existing data (no API call)
    } else {
      // Clear search mode when filter is empty
      setIsSearchMode(false);
      // Only clear search sessions if watchlist filter is not active
      // (watchlist needs the expanded results to find all watched items)
      if (!showWatchlistOnly) {
        setSearchSessions([]);
        searchSessionsFetched.current = false; // Reset so next search triggers fetch
      }
    }
  };

  useEffect(() => {
    vscode.postMessage({ type: "checkEmailStatus" });
    vscode.postMessage({ type: "getWatchlist" });
    fetchSessions(0, false); // Default to all sessions

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "sessionsResponse") {
        if (message.isSearch) {
          // Handle search response
          setSearchSessions(message.sessions);
          setSearchLoading(false);
        } else {
          // Handle normal paginated response
          setSessions(message.sessions);
          setLoading(false);
        }
      } else if (message.type === "sessionCreated") {
        setCreating(false);
        setNewSessionPrompt("");
        fetchSessions(0, showMySessions);
        if (message.session && message.session.session_id) {
          onSelectSession(message.session.session_id);
        }
      } else if (message.type === "emailStatusResponse") {
        setEmailSet(message.emailSet);
      } else if (message.type === "watchlistResponse") {
        setWatchlist(message.watchlist || []);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleCreateSession = () => {
    if (!newSessionPrompt.trim()) return;
    setCreating(true);
    vscode.postMessage({ type: "createSession", prompt: newSessionPrompt });
  };

  const handleNextPage = () => {
    const newOffset = offset + PAGE_LIMIT;
    setOffset(newOffset);
    fetchSessions(newOffset, showMySessions);
  };

  const handlePrevPage = () => {
    const newOffset = Math.max(0, offset - PAGE_LIMIT);
    setOffset(newOffset);
    fetchSessions(newOffset, showMySessions);
  };

  const handleToggleMySessions = () => {
    const newValue = !showMySessions;
    setShowMySessions(newValue);
    setOffset(0);
    fetchSessions(0, newValue);
    // Reset and re-fetch search results if in search mode (filter changed)
    if (isSearchMode && filter.trim()) {
      searchSessionsFetched.current = false; // Reset to allow new fetch
      setSearchLoading(true);
      vscode.postMessage({
        type: "listSessions",
        limit: SEARCH_LIMIT,
        offset: 0,
        mySessions: newValue,
        isSearch: true,
      });
      searchSessionsFetched.current = true;
    }
  };

  const handleToggleWatchlist = () => {
    const newValue = !showWatchlistOnly;
    setShowWatchlistOnly(newValue);

    // When enabling watchlist filter, fetch a large batch to find all watchlisted items
    if (newValue && !isSearchMode && searchSessions.length === 0) {
      searchSessionsFetched.current = false;
      setSearchLoading(true);
      vscode.postMessage({
        type: "listSessions",
        limit: SEARCH_LIMIT,
        offset: 0,
        mySessions: showMySessions,
        isSearch: true,
      });
      searchSessionsFetched.current = true;
    }
  };

  const handleOpenPR = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "openLink", url });
  };

  const handleToggleWatchlistItem = (
    e: React.MouseEvent,
    sessionId: string
  ) => {
    e.stopPropagation();
    if (watchlist.includes(sessionId)) {
      vscode.postMessage({ type: "removeFromWatchlist", sessionId });
    } else {
      vscode.postMessage({ type: "addToWatchlist", sessionId });
    }
  };

  const isInWatchlist = (sessionId: string) => watchlist.includes(sessionId);

  // Use search sessions when in search mode OR when watchlist filter is active
  // This ensures watchlisted items can be found even if they're not in the current page
  const useExpandedResults =
    isSearchMode || (showWatchlistOnly && searchSessions.length > 0);
  const baseSessions = useExpandedResults ? searchSessions : sessions;

  let filteredSessions = baseSessions.filter(
    (session) =>
      session.title.toLowerCase().includes(filter.toLowerCase()) ||
      session.status.toLowerCase().includes(filter.toLowerCase()) ||
      (session.requesting_user_email || "")
        .toLowerCase()
        .includes(filter.toLowerCase())
  );

  // Apply watchlist filter
  if (showWatchlistOnly) {
    filteredSessions = filteredSessions.filter((session) =>
      watchlist.includes(session.session_id)
    );
  }

  const isLoading = useExpandedResults ? searchLoading : loading;

  return (
    <div
      className="session-list"
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <div
        className="header"
        style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
          <VSCodeTextField
            placeholder="Search sessions (searches up to 1000)..."
            value={filter}
            onInput={(e: any) => handleFilterInput(e.target.value)}
            style={{ flexGrow: 1 }}
          >
            Search
          </VSCodeTextField>
          {isSearchMode && (
            <VSCodeButton
              appearance="secondary"
              onClick={() => {
                setFilter("");
                setIsSearchMode(false);
                // Only clear search sessions if watchlist filter is not active
                if (!showWatchlistOnly) {
                  setSearchSessions([]);
                  searchSessionsFetched.current = false;
                }
              }}
              style={{ whiteSpace: "nowrap" }}
            >
              Clear
            </VSCodeButton>
          )}
        </div>

        {isSearchMode && !searchLoading && (
          <div
            style={{
              fontSize: "12px",
              opacity: 0.7,
            }}
          >
            Searching across {searchSessions.length} sessions • Found{" "}
            {filteredSessions.length} matching "{filter}"
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {emailSet && (
            <VSCodeCheckbox
              checked={showMySessions}
              onChange={handleToggleMySessions}
            >
              Show My Sessions Only
            </VSCodeCheckbox>
          )}
          <VSCodeCheckbox
            checked={showWatchlistOnly}
            onChange={handleToggleWatchlist}
          >
            ⭐ Watchlist Only
          </VSCodeCheckbox>
        </div>
      </div>

      <div
        className="create-session"
        style={{
          padding: "0 1rem 1rem 1rem",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <VSCodeTextField
          placeholder="New session prompt..."
          value={newSessionPrompt}
          onInput={(e: any) => setNewSessionPrompt(e.target.value)}
          style={{ flexGrow: 1 }}
        >
          Create New Session
        </VSCodeTextField>
        <VSCodeButton onClick={handleCreateSession} disabled={creating}>
          {creating ? "Creating..." : "+ Create"}
        </VSCodeButton>
      </div>

      <div style={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
        {isLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem",
            }}
          >
            <VSCodeProgressRing></VSCodeProgressRing>
          </div>
        ) : (
          <VSCodeDataGrid grid-template-columns="40px 3fr 2fr minmax(60px, 0.8fr) 40px 1.5fr">
            <VSCodeDataGridRow
              row-type="header"
              style={{ position: "sticky", top: 0, zIndex: 1 }}
            >
              <VSCodeDataGridCell cell-type="columnheader" grid-column="1">
                ⭐
              </VSCodeDataGridCell>
              <VSCodeDataGridCell cell-type="columnheader" grid-column="2">
                Title
              </VSCodeDataGridCell>
              <VSCodeDataGridCell cell-type="columnheader" grid-column="3">
                User
              </VSCodeDataGridCell>
              <VSCodeDataGridCell cell-type="columnheader" grid-column="4">
                PR
              </VSCodeDataGridCell>
              <VSCodeDataGridCell
                cell-type="columnheader"
                grid-column="5"
                style={{ textAlign: "center" }}
              >
                ●
              </VSCodeDataGridCell>
              <VSCodeDataGridCell cell-type="columnheader" grid-column="6">
                Updated
              </VSCodeDataGridCell>
            </VSCodeDataGridRow>
            {filteredSessions.map((session) => (
              <VSCodeDataGridRow
                key={session.session_id}
                onClick={() => onSelectSession(session.session_id)}
                style={{ cursor: "pointer" }}
              >
                <VSCodeDataGridCell grid-column="1">
                  <span
                    onClick={(e) =>
                      handleToggleWatchlistItem(e, session.session_id)
                    }
                    style={{
                      cursor: "pointer",
                      fontSize: "16px",
                      opacity: isInWatchlist(session.session_id) ? 1 : 0.3,
                      transition: "opacity 0.2s",
                    }}
                    title={
                      isInWatchlist(session.session_id)
                        ? "Remove from watchlist"
                        : "Add to watchlist"
                    }
                  >
                    ⭐
                  </span>
                </VSCodeDataGridCell>
                <VSCodeDataGridCell grid-column="2">
                  {session.title}
                </VSCodeDataGridCell>
                <VSCodeDataGridCell
                  grid-column="3"
                  style={{
                    fontSize: "12px",
                    opacity: 0.8,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={session.requesting_user_email || ""}
                >
                  {session.requesting_user_email || "—"}
                </VSCodeDataGridCell>
                <VSCodeDataGridCell grid-column="4">
                  {session.pull_request && (
                    <VSCodeButton
                      appearance="secondary"
                      aria-label="Pull Request"
                      onClick={(e: any) =>
                        handleOpenPR(e, session.pull_request!.url)
                      }
                      style={{
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        padding: "4px 8px",
                      }}
                    >
                      PR
                    </VSCodeButton>
                  )}
                </VSCodeDataGridCell>
                <VSCodeDataGridCell
                  grid-column="5"
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <StatusBadge status={session.status} />
                </VSCodeDataGridCell>
                <VSCodeDataGridCell grid-column="6">
                  {new Date(session.updated_at).toLocaleString()}
                </VSCodeDataGridCell>
              </VSCodeDataGridRow>
            ))}
          </VSCodeDataGrid>
        )}
      </div>

      {/* Only show pagination when not in search mode and watchlist filter is off */}
      {!isSearchMode && !showWatchlistOnly && (
        <div
          style={{
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid var(--vscode-widget-border)",
          }}
        >
          <VSCodeButton
            onClick={handlePrevPage}
            disabled={offset === 0 || loading}
            appearance="secondary"
          >
            Previous
          </VSCodeButton>
          <span style={{ alignSelf: "center" }}>
            Page {Math.floor(offset / PAGE_LIMIT) + 1}
          </span>
          <VSCodeButton
            onClick={handleNextPage}
            disabled={loading || sessions.length < PAGE_LIMIT}
            appearance="secondary"
          >
            Next
          </VSCodeButton>
        </div>
      )}
    </div>
  );
};

export default SessionList;
