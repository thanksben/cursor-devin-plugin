import React from "react";

interface StatusBadgeProps {
  status: string;
}

const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    // Active states - Green
    case "working":
    case "resumed":
      return "#4CAF50"; // Green

    // Needs attention - Orange/Amber
    case "blocked":
      return "#FF9800"; // Orange

    // Pending actions - Yellow
    case "suspend_requested":
    case "suspend_requested_frontend":
      return "#FFC107"; // Amber/Yellow

    // Resume pending - Cyan/Light blue
    case "resume_requested":
    case "resume_requested_frontend":
      return "#00BCD4"; // Cyan

    // Completed - Blue
    case "finished":
      return "#2196F3"; // Blue

    // Inactive/Dead - Gray
    case "expired":
      return "#9E9E9E"; // Gray

    // Error states - Red
    case "error":
    case "failed":
      return "#F44336"; // Red

    // Default - Gray
    default:
      return "#757575"; // Dark gray
  }
};

const getStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case "working":
      return "Working - Devin is actively working";
    case "blocked":
      return "Blocked - Waiting for user input";
    case "expired":
      return "Expired - Session has expired";
    case "finished":
      return "Finished - Session completed";
    case "suspend_requested":
    case "suspend_requested_frontend":
      return "Suspend Requested";
    case "resume_requested":
    case "resume_requested_frontend":
      return "Resume Requested";
    case "resumed":
      return "Resumed - Session is active again";
    default:
      return status;
  }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);

  return (
    <span
      title={label}
      style={{
        display: "inline-block",
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        backgroundColor: color,
        boxShadow: `0 0 4px ${color}80`,
        cursor: "help",
      }}
    />
  );
};

export default StatusBadge;
