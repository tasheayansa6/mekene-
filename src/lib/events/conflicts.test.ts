import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateEventScheduling } from './conflicts';

describe('validateEventScheduling', () => {
  it('skips venue checks when no location', async () => {
    const result = await validateEventScheduling({
      locationId: null,
      startAt: new Date('2026-08-24T10:00:00Z'),
      endAt: new Date('2026-08-24T12:00:00Z'),
      capacity: 100,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.warnings.length, 0);
  });
});
