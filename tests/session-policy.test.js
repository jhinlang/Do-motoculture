import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_IDLE_TIMEOUT_MS,
  SESSION_TOUCH_INTERVAL_MS,
  isSessionIdleExpired,
  shouldTouchSession,
} from '../server/src/session-policy.js';

const now = new Date('2026-07-22T12:00:00.000Z');

test('an admin session remains valid before the idle timeout', () => {
  const session = { lastSeenAt: new Date(now.getTime() - ADMIN_IDLE_TIMEOUT_MS + 1) };
  assert.equal(isSessionIdleExpired(session, { role: 'ADMIN' }, now), false);
});

test('an admin session expires after 30 minutes of inactivity', () => {
  const session = { lastSeenAt: new Date(now.getTime() - ADMIN_IDLE_TIMEOUT_MS) };
  assert.equal(isSessionIdleExpired(session, { role: 'ADMIN' }, now), true);
});

test('the idle timeout does not shorten customer sessions', () => {
  const session = { lastSeenAt: new Date(0) };
  assert.equal(isSessionIdleExpired(session, { role: 'CUSTOMER' }, now), false);
});

test('session activity is persisted at most once every five minutes', () => {
  assert.equal(shouldTouchSession(
    { lastSeenAt: new Date(now.getTime() - SESSION_TOUCH_INTERVAL_MS + 1) },
    now,
  ), false);
  assert.equal(shouldTouchSession(
    { lastSeenAt: new Date(now.getTime() - SESSION_TOUCH_INTERVAL_MS) },
    now,
  ), true);
});
