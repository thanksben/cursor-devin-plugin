import React from "react";

interface StatusBadgeProps {
  status: string;
  showLabel?: boolean;
}

// Handles both API status enums:
// - v1 status_enum: working | blocked | finished | expired | resumed |
//   suspend_requested(_frontend) | resume_requested(_frontend)
// - v3 status: new | claimed | running | exit | error | suspended | resuming
//   (with status_detail: working | waiting_for_user | waiting_for_approval | finished)
const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    // Active states - Green
    case "working":
    case "running":
    case "resumed":
      return "#4CAF50"; // Green

    // Needs attention - Orange/Amber
    case "blocked":
    case "waiting_for_user":
    case "waiting_for_approval":
      return "#FF9800"; // Orange

    // Pending actions - Yellow
    case "suspend_requested":
    case "suspend_requested_frontend":
      return "#FFC107"; // Amber/Yellow

    // Starting / resume pending - Cyan/Light blue
    case "new":
    case "claimed":
    case "resume_requested":
    case "resume_requested_frontend":
    case "resuming":
      return "#00BCD4"; // Cyan

    // Completed - Blue
    case "finished":
    case "exit":
      return "#2196F3"; // Blue

    // Inactive/Dead - Gray
    case "expired":
    case "suspended":
      return "#9E9E9E"; // Gray

    // Error states - Red
    case "error":
      return "#F44336"; // Red

    // Default - Gray
    default:
      return "#757575"; // Dark gray
  }
};

const getStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case "working":
    case "running":
      return "Working - Devin is actively working";
    case "blocked":
    case "waiting_for_user":
      return "Blocked - Waiting for user input";
    case "waiting_for_approval":
      return "Waiting for approval - Devin needs you to approve an action";
    case "new":
    case "claimed":
      return "Starting - Session is starting up";
    case "expired":
      return "Expired - Session has expired";
    case "finished":
    case "exit":
      return "Finished - Session completed";
    case "suspend_requested":
    case "suspend_requested_frontend":
      return "Suspend Requested";
    case "resume_requested":
    case "resume_requested_frontend":
    case "resuming":
      return "Resume Requested";
    case "resumed":
      return "Resumed - Session is active again";
    case "suspended":
      return "Suspended - Session is paused";
    case "error":
      return "Error - Session encountered an error";
    default:
      return status;
  }
};

const getShortLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case "working":
    case "running":
    case "resumed":
      return "Working";
    case "blocked":
    case "waiting_for_user":
      return "Waiting for you";
    case "waiting_for_approval":
      return "Needs approval";
    case "new":
    case "claimed":
      return "Starting";
    case "suspend_requested":
    case "suspend_requested_frontend":
      return "Suspending";
    case "resume_requested":
    case "resume_requested_frontend":
    case "resuming":
      return "Resuming";
    case "finished":
    case "exit":
      return "Finished";
    case "expired":
      return "Expired";
    case "suspended":
      return "Suspended";
    case "error":
      return "Error";
    default:
      return status;
  }
};

const isActiveStatus = (status: string): boolean => {
  switch (status.toLowerCase()) {
    case "working":
    case "running":
    case "resumed":
    case "new":
    case "claimed":
    case "resume_requested":
    case "resume_requested_frontend":
    case "resuming":
      return true;
    default:
      return false;
  }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showLabel }) => {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  const dot = (
    <span
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 4px ${color}80`,
        flexShrink: 0,
        animation: isActiveStatus(status)
          ? "status-pulse 1.5s ease-in-out infinite"
          : "none",
      }}
    />
  );

  if (!showLabel) {
    return (
      <span title={label} style={{ cursor: "help", display: "inline-flex" }}>
        {dot}
      </span>
    );
  }

  return (
    <span
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "2px 10px",
        borderRadius: "10px",
        border: `1px solid ${color}60`,
        backgroundColor: `${color}1A`,
        fontSize: "12px",
        whiteSpace: "nowrap",
        cursor: "help",
      }}
    >
      <style>
        {`@keyframes status-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }`}
      </style>
      {dot}
      {getShortLabel(status)}
    </span>
  );
};

export default StatusBadge;
