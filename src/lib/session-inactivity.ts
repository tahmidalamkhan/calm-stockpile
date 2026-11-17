export const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
export const INACTIVITY_WARNING_MS = 60 * 1000;

export function usesInactivityLogout(role: string | null): boolean {
  return role === "staff" || role === "manager";
}

export function inactivityState(lastActivity: number, now: number) {
  const remainingMs = Math.max(0, INACTIVITY_TIMEOUT_MS - Math.max(0, now - lastActivity));
  return {
    expired: remainingMs === 0,
    warning: remainingMs > 0 && remainingMs <= INACTIVITY_WARNING_MS,
    secondsRemaining: Math.ceil(remainingMs / 1000),
  };
}

export function readActivityTimestamp(value: string | null, now: number): number | null {
  if (!value) return null;
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 && timestamp <= now ? timestamp : null;
}