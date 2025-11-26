import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { vscode } from "../utilities/vscode";

interface MessageBubbleProps {
  role: string;
  content: string | any; // Allow any to handle potential objects
  timestamp?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  timestamp,
}) => {
  const isUser = role === "user";

  // Safely convert content to string
  let displayContent = "";
  if (typeof content === "string") {
    displayContent = content;
  } else if (typeof content === "object" && content !== null) {
    // Try to extract text if it's a structured object
    if (content.text) {
      displayContent = content.text;
    } else {
      // Fallback: pretty print the JSON
      displayContent = "```json\n" + JSON.stringify(content, null, 2) + "\n```";
    }
  } else if (content !== undefined && content !== null) {
    displayContent = String(content);
  } else {
    displayContent = "(No content)";
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        marginBottom: "1rem",
        maxWidth: "100%",
      }}
    >
      <div
        style={{
          fontSize: "0.8em",
          marginBottom: "0.2rem",
          opacity: 0.7,
        }}
      >
        {isUser ? "You" : "Devin"} •{" "}
        {timestamp ? new Date(timestamp).toLocaleTimeString() : ""}
      </div>
      <div
        style={{
          backgroundColor: isUser
            ? "#2B5278" // Telegram-style muted blue for user messages
            : "#313244", // Catppuccin Surface0 - lighter dark for Devin
          color: isUser ? "#FFFFFF" : "#CDD6F4", // White for user, soft white for Devin
          padding: "0.75rem 1rem",
          borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
          maxWidth: "85%",
          wordWrap: "break-word",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              return !inline && match ? (
                <SyntaxHighlighter
                  {...props}
                  children={String(children).replace(/\n$/, "")}
                  style={vscDarkPlus}
                  language={match[1]}
                  PreTag="div"
                />
              ) : (
                <code {...props} className={className}>
                  {children}
                </code>
              );
            },
            a({ href, children }: any) {
              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (href) {
                  vscode.postMessage({ type: "openLink", url: href });
                }
              };
              return (
                <span
                  onClick={handleClick}
                  style={{
                    color: "#89B4FA", // Catppuccin blue - visible on both backgrounds
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  title={href}
                  role="link"
                >
                  {children}
                </span>
              );
            },
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MessageBubble;
