// Zone status → CSS class + marker color
export function zoneStatusClass(status) {
  switch (status) {
    case "ACTIVE":
      return "status-active";
    case "MONITORING":
      return "status-monitoring";
    case "COMPLETED":
      return "status-completed";
    default:
      return "status-monitoring";
  }
}

export function zoneStatusColor(status) {
  switch (status) {
    case "ACTIVE":
      return "#4c6b4f";
    case "MONITORING":
      return "#b6742a";
    case "COMPLETED":
      return "#55524a";
    default:
      return "#b6742a";
  }
}

// Rehabilitation activity status — a genuine sequence, used by the stage tracker
export const ACTIVITY_STAGES = [
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
];

export function activityStageIndex(status) {
  if (status === "REJECTED") return -1;
  return ACTIVITY_STAGES.indexOf(status);
}
