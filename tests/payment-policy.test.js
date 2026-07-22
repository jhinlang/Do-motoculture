import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKOUT_RATE_LIMIT_MAX,
  CHECKOUT_RATE_LIMIT_WINDOW_MS,
} from '../server/src/payment-policy.js';

test('checkout creation is limited to ten attempts per fifteen minutes', () => {
  assert.equal(CHECKOUT_RATE_LIMIT_MAX, 10);
  assert.equal(CHECKOUT_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
});
