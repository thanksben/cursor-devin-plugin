import React, { useState, useEffect } from "react";
import { vscode } from "./utilities/vscode";
import SessionList from "./components/SessionList";
import ChatView from "./components/ChatView";

const App = () => {
  const [currentView, setCurrentView] = useState<"list" | "chat">("list");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null
  );

  // Listen for global errors or navigation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // ... global handlers
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentView("chat");
  };

  const handleBack = () => {
    setCurrentView("list");
    setSelectedSessionId(null);
  };

  return (
    <div className="container" style={{ height: "100vh", overflow: "hidden" }}>
      {currentView === "list" ? (
        <SessionList onSelectSession={handleSessionSelect} />
      ) : (
        <ChatView sessionId={selectedSessionId!} onBack={handleBack} />
      )}
    </div>
  );
};

export default App;
