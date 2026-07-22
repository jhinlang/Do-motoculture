export const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

function lastActivityAt(session) {
  return session.lastSeenAt ?? session.createdAt;
}

export function isSessionIdleExpired(session, user, now = new Date()) {
  if (user.role !== 'ADMIN') return false;
  const lastActivity = lastActivityAt(session);
  if (!lastActivity) return true;
  return now.getTime() - new Date(lastActivity).getTime() >= ADMIN_IDLE_TIMEOUT_MS;
}

export function shouldTouchSession(session, now = new Date()) {
  const lastActivity = lastActivityAt(session);
  if (!lastActivity) return true;
  return now.getTime() - new Date(lastActivity).getTime() >= SESSION_TOUCH_INTERVAL_MS;
}
