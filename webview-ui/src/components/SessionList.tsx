import React, { useEffect, useState } from "react";
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
  pull_request?: {
    url: string;
  };
}

interface SessionListProps {
  onSelectSession: (sessionId: string) => void;
}

const SessionList: React.FC<SessionListProps> = ({ onSelectSession }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [newSessionPrompt, setNewSessionPrompt] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const [emailSet, setEmailSet] = useState(false);
  const [showMySessions, setShowMySessions] = useState(true);

  const fetchSessions = (currentOffset: number, mySessions: boolean) => {
    setLoading(true);
    vscode.postMessage({
      type: "listSessions",
      limit,
      offset: currentOffset,
      mySessions,
    });
  };

  useEffect(() => {
    vscode.postMessage({ type: "checkEmailStatus" });
    fetchSessions(0, true);

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "sessionsResponse") {
        setSessions(message.sessions);
        setLoading(false);
      } else if (message.type === "sessionCreated") {
        setCreating(false);
        setNewSessionPrompt("");
        fetchSessions(0, showMySessions);
        if (message.session && message.session.session_id) {
          onSelectSession(message.session.session_id);
        }
      } else if (message.type === "emailStatusResponse") {
        setEmailSet(message.emailSet);
        if (!message.emailSet) {
          setShowMySessions(false);
          fetchSessions(0, false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleCreateSession = () => {
    if (!newSessionPrompt.trim()) return;
    setCreating(true);
    vscode.postMessage({ type: "createSession", prompt: newSessionPrompt });
  };

  const handleNextPage = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchSessions(newOffset, showMySessions);
  };

  const handlePrevPage = () => {
    const newOffset = Math.max(0, offset - limit);
    setOffset(newOffset);
    fetchSessions(newOffset, showMySessions);
  };

  const handleToggleMySessions = () => {
    const newValue = !showMySessions;
    setShowMySessions(newValue);
    setOffset(0);
    fetchSessions(0, newValue);
  };

  const handleOpenPR = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "openLink", url });
  };

  const filteredSessions = sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(filter.toLowerCase()) ||
      session.status.toLowerCase().includes(filter.toLowerCase())
  );

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
            placeholder="Filter sessions locally..."
            value={filter}
            onInput={(e: any) => setFilter(e.target.value)}
            style={{ flexGrow: 1 }}
          >
            Filter
          </VSCodeTextField>
        </div>

        {emailSet && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <VSCodeCheckbox
              checked={showMySessions}
              onChange={handleToggleMySessions}
            >
              Show My Sessions Only
            </VSCodeCheckbox>
          </div>
        )}
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
        {loading ? (
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
          <VSCodeDataGrid grid-template-columns="3fr minmax(100px, 1.2fr) 1fr 2fr">
            <VSCodeDataGridRow
              row-type="header"
              style={{ position: "sticky", top: 0, zIndex: 1 }}
            >
              <VSCodeDataGridCell cell-type="columnheader" grid-column="1">
                Title
              </VSCodeDataGridCell>
              <VSCodeDataGridCell cell-type="columnheader" grid-column="2">
                Pull Request
              </VSCodeDataGridCell>
              <VSCodeDataGridCell cell-type="columnheader" grid-column="3">
                Status
              </VSCodeDataGridCell>
              <VSCodeDataGridCell cell-type="columnheader" grid-column="4">
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
                  {session.title}
                </VSCodeDataGridCell>
                <VSCodeDataGridCell grid-column="2">
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
                <VSCodeDataGridCell grid-column="3">
                  <StatusBadge status={session.status} />
                </VSCodeDataGridCell>
                <VSCodeDataGridCell grid-column="4">
                  {new Date(session.updated_at).toLocaleString()}
                </VSCodeDataGridCell>
              </VSCodeDataGridRow>
            ))}
          </VSCodeDataGrid>
        )}
      </div>

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
          Page {Math.floor(offset / limit) + 1}
        </span>
        <VSCodeButton
          onClick={handleNextPage}
          disabled={loading || sessions.length < limit}
          appearance="secondary"
        >
          Next
        </VSCodeButton>
      </div>
    </div>
  );
};

export default SessionList;
