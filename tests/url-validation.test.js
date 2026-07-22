import test from 'node:test';
import assert from 'node:assert/strict';
import { httpUrlSchema } from '../server/src/routes/admin.js';

test('les images HTTP et HTTPS sont acceptées', () => {
  assert.equal(httpUrlSchema.parse('https://images.example.test/piece.jpg'), 'https://images.example.test/piece.jpg');
  assert.equal(httpUrlSchema.parse('http://localhost:3000/test.png'), 'http://localhost:3000/test.png');
});

test('les protocoles non web et les identifiants intégrés sont refusés', () => {
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml,test', 'https://user:secret@example.test/image.jpg']) {
    assert.equal(httpUrlSchema.safeParse(value).success, false);
  }
});
