import { User } from "../types/auth";

/**
 * Determines whether a user is currently active and online.
 * Criteria:
 * 1. user.isOnline must be true
 * 2. user.lastActiveAt must exist and be within the threshold (default: 2.5 minutes)
 */
export function isUserOnline(user?: User | null, thresholdMs: number = 150000): boolean {
  if (!user || !user.isOnline || !user.lastActiveAt) {
    return false;
  }

  const lastActiveTime = new Date(user.lastActiveAt).getTime();
  if (isNaN(lastActiveTime)) {
    return false;
  }

  const diff = Date.now() - lastActiveTime;
  // If active within thresholdMs (and not in the future by more than 10 seconds)
  return diff >= -10000 && diff <= thresholdMs;
}

/**
 * Formats the last active timestamp into a human-friendly relative or calendar string.
 */
export function formatLastActive(lastActiveAt?: string | null): string {
  if (!lastActiveAt) {
    return "Never logged in";
  }

  const date = new Date(lastActiveAt);
  const timeMs = date.getTime();
  if (isNaN(timeMs)) {
    return "Never logged in";
  }

  const diffMs = Date.now() - timeMs;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) {
    return "Just now";
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${diffHours}h ago (${timeStr})`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `Yesterday, ${timeStr}`;
  }

  if (diffDays < 7) {
    const dayStr = date.toLocaleDateString([], { weekday: "short" });
    const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `${dayStr}, ${timeStr}`;
  }

  // Full date
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Returns a precise ISO/locale timestamp for hover tooltips.
 */
export function getFullTimestamp(lastActiveAt?: string | null): string {
  if (!lastActiveAt) return "No recorded activity";
  const date = new Date(lastActiveAt);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

/**
 * Formats cumulative active time in minutes into hours and minutes.
 */
export function formatActiveTime(minutes?: number | null): string {
  if (minutes === undefined || minutes === null || isNaN(minutes) || minutes <= 0) {
    return "0m";
  }

  const totalMin = Math.round(minutes);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}
