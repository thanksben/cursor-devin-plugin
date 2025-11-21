import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

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
            ? "#37373D" // Dark grey/blue tint for user messages in dark mode
            : "var(--vscode-editor-inactiveSelectionBackground)",
          color: "var(--vscode-editor-foreground)", // Use standard foreground text color
          padding: "0.8rem",
          borderRadius: "8px",
          maxWidth: "85%",
          wordWrap: "break-word",
          border: isUser ? "1px solid var(--vscode-widget-border)" : "none",
        }}
      >
        <ReactMarkdown
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
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MessageBubble;
