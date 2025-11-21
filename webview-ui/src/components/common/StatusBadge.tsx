import React from "react";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let backgroundColor = "var(--vscode-badge-background)";
  let color = "var(--vscode-badge-foreground)";

  switch (status.toLowerCase()) {
    case "running":
    case "working":
      backgroundColor = "var(--vscode-charts-green)";
      color = "#ffffff";
      break;
    case "stopped":
    case "terminated":
    case "done":
      backgroundColor = "var(--vscode-charts-red)";
      color = "#ffffff";
      break;
    case "blocked":
    case "error":
      backgroundColor = "var(--vscode-charts-orange)";
      color = "#ffffff";
      break;
    default:
      backgroundColor = "var(--vscode-badge-background)";
      color = "var(--vscode-badge-foreground)";
      break;
  }

  return (
    <span
      style={{
        backgroundColor,
        color,
        padding: "2px 6px",
        borderRadius: "4px",
        fontSize: "0.85em",
        fontWeight: "bold",
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
