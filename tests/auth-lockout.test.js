import test from 'node:test';
import assert from 'node:assert/strict';
import { clearExpiredLoginLock, recordLoginFailure } from '../server/src/routes/auth.js';

test('un verrou expiré remet le compteur à zéro', async () => {
  const calls = [];
  const client = { user: { update: async (query) => { calls.push(query); return { id: 'u1', failedLoginAttempts: 0, lockedUntil: null }; } } };
  const result = await clearExpiredLoginLock({ id: 'u1', failedLoginAttempts: 5, lockedUntil: new Date(Date.now() - 1000) }, client);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].data, { failedLoginAttempts: 0, lockedUntil: null });
  assert.equal(result.failedLoginAttempts, 0);
});

test('le cinquième échec verrouille temporairement le compte', async () => {
  const calls = [];
  const client = { user: { update: async (query) => { calls.push(query); return calls.length === 1 ? { id: 'u1', failedLoginAttempts: 5, lockedUntil: null } : { id: 'u1', failedLoginAttempts: 5, lockedUntil: query.data.lockedUntil }; } } };
  const before = Date.now();
  const result = await recordLoginFailure({ id: 'u1' }, client);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].data, { failedLoginAttempts: { increment: 1 } });
  assert.ok(result.lockedUntil.getTime() >= before + 14 * 60 * 1000);
});
