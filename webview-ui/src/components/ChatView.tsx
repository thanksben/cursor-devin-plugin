import React, { useState, useEffect, useRef } from "react";
import { vscode } from "../utilities/vscode";
import MessageBubble from "./MessageBubble";
import {
  VSCodeButton,
  VSCodeTextArea,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";

interface ChatViewProps {
  sessionId: string;
  onBack: () => void;
}

interface Message {
  role: string;
  content: string; // This is our internal field, we map 'message' to it
  created_at?: string;
}

const ChatView: React.FC<ChatViewProps> = ({ sessionId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionTitle, setSessionTitle] = useState("");
  const [isNearBottom, setIsNearBottom] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Handle scroll events to detect if user is near bottom
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // Consider "near bottom" if within 100px of the bottom
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(nearBottom);
  };

  useEffect(() => {
    fetchSessionDetails();
    const interval = setInterval(fetchSessionDetails, 5000);

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "sessionDetailsResponse") {
        if (message.sessionId === sessionId) {
          // Handle different potential API structures
          let rawMsgs: any[] = [];
          if (Array.isArray(message.session.messages)) {
            rawMsgs = message.session.messages;
          } else if (Array.isArray(message.session.events)) {
            rawMsgs = message.session.events.filter(
              (e: any) => e.type === "chat" || e.role || e.message
            );
          }
          
          // Map API messages to our local Message interface
          const mappedMsgs: Message[] = rawMsgs.map((msg: any) => {
            // Determine role
            let role = "assistant"; // default
            if (msg.role) {
              role = msg.role;
            } else if (msg.type === "initial_user_message") {
              role = "user";
            } else if (msg.type === "devin_message") {
              role = "assistant";
            }

            // Determine content
            const content = msg.content || msg.message || "";

            // Determine timestamp
            const created_at = msg.created_at || msg.timestamp;

            return { role, content, created_at };
          });
          
          setMessages(mappedMsgs);
          setSessionTitle(message.session.title || "Session");
          setLoading(false);
        }
      } else if (message.type === "messageSent") {
        setSending(false);
        setInput("");
        fetchSessionDetails();
        // Force scroll to bottom when sending
        setIsNearBottom(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
    };
  }, [sessionId]);

  // Only auto-scroll if user is near bottom
  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, isNearBottom]);

  const fetchSessionDetails = () => {
    vscode.postMessage({ type: "getSession", sessionId });
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setSending(true);
    vscode.postMessage({ type: "sendMessage", sessionId, message: input });
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        className="chat-header"
        style={{
          padding: "1rem",
          borderBottom: "1px solid var(--vscode-widget-border)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexShrink: 0,
        }}
      >
        <VSCodeButton appearance="secondary" onClick={onBack}>
          &larr; Back
        </VSCodeButton>
        <h3
          style={{
            margin: 0,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {sessionTitle}
        </h3>
      </div>

      <div
        className="messages-container"
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {loading && messages.length === 0 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "2rem",
            }}
          >
            <VSCodeProgressRing></VSCodeProgressRing>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              role={msg.role}
              content={msg.content}
              timestamp={msg.created_at}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="input-area"
        style={{
          padding: "1rem",
          borderTop: "1px solid var(--vscode-widget-border)",
          display: "flex",
          gap: "0.5rem",
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        <VSCodeTextArea
          placeholder="Type a message..."
          value={input}
          onInput={(e: any) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          resize="vertical"
          style={{ flexGrow: 1 }}
        ></VSCodeTextArea>
        <VSCodeButton onClick={handleSend} disabled={sending}>
          {sending ? "Sending..." : "Send"}
        </VSCodeButton>
      </div>
    </div>
  );
};

export default ChatView;
