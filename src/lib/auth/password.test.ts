import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('uses a one-way hash', async () => {
    const hash = await hashPassword('CorrectHorse9');
    assert.notEqual(hash, 'CorrectHorse9');
    assert.equal(hash.startsWith('$2'), true);
    assert.equal(await verifyPassword('CorrectHorse9', hash), true);
    assert.equal(await verifyPassword('wrong-password', hash), false);
  });
});
