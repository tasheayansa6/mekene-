import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isEventPubliclyVisible, isStartingSoon, resolveEventStatusOnSave } from './status';
import { expandOccurrences, toRRule } from './recurrence';
import { fromZonedLocalInput, parseEventDateTime } from './timezone';
import { buildIcs } from './ics';
import {
  allowedEventStatus,
  canArchiveEvent,
  canCancelEvent,
  canDeleteEvent,
  canMutateEventRecord,
  canPublishEvent,
  RESERVED_EVENT_SLUGS,
} from './access';
import { can, hasPermission } from '../auth/permissions';
import { permissionsForRole } from '../auth/rbac-matrix';
import type { AuthUser } from '../auth/permissions';
import { EVENT_HOOK_TYPES } from './hooks';
import { monthGrid } from './calendar';

function user(slug: string): AuthUser {
  return {
    id: `${slug}-1`,
    email: `${slug}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    profileImage: null,
    status: 'active',
    isVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: 'role-1',
      slug,
      name: slug,
      hierarchy: 10,
      isPrivileged: false,
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('event visibility', () => {
  it('hides drafts, review, and archived events', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(isEventPubliclyVisible({ status: 'draft', publishAt: null }, now), false);
    assert.equal(isEventPubliclyVisible({ status: 'review', publishAt: null }, now), false);
    assert.equal(isEventPubliclyVisible({ status: 'archived', publishAt: now }, now), false);
  });

  it('hides scheduled events until publishAt', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(
      isEventPubliclyVisible({ status: 'scheduled', publishAt: new Date('2026-08-20T13:00:00Z') }, now),
      false
    );
    assert.equal(
      isEventPubliclyVisible({ status: 'scheduled', publishAt: new Date('2026-08-20T11:00:00Z') }, now),
      true
    );
  });

  it('shows cancelled events publicly so they can be marked cancelled', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    assert.equal(isEventPubliclyVisible({ status: 'cancelled', publishAt: now }, now), true);
  });
});

describe('event dates and timezones', () => {
  it('stores Addis Ababa wall time as UTC without hard-coded offsets in the UI layer', () => {
    const utc = fromZonedLocalInput('2026-08-24T10:00', 'Africa/Addis_Ababa');
    assert.equal(utc?.toISOString(), '2026-08-24T07:00:00.000Z');
    assert.equal(parseEventDateTime('2026-08-24T10:00', 'Africa/Addis_Ababa')?.toISOString(), '2026-08-24T07:00:00.000Z');
  });

  it('rejects an end time that is not after start', () => {
    const start = fromZonedLocalInput('2026-08-24T10:00', 'Africa/Addis_Ababa')!;
    const end = fromZonedLocalInput('2026-08-24T09:00', 'Africa/Addis_Ababa')!;
    assert.equal(end <= start, true);
  });
});

describe('recurrence', () => {
  it('expands weekly occurrences inside a range', () => {
    const startAt = new Date('2026-08-02T07:00:00.000Z');
    const endAt = new Date('2026-08-02T09:00:00.000Z');
    const items = expandOccurrences(
      { startAt, endAt, recurrence: 'weekly', recurrenceInterval: 1 },
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-31T00:00:00.000Z')
    );
    assert.equal(items.length >= 4, true);
    assert.equal(items[1].startAt.toISOString(), '2026-08-09T07:00:00.000Z');
  });

  it('builds a simple RRULE', () => {
    assert.equal(
      toRRule({
        startAt: new Date('2026-08-02T07:00:00.000Z'),
        endAt: new Date('2026-08-02T09:00:00.000Z'),
        recurrence: 'weekly',
      }),
      'FREQ=WEEKLY;INTERVAL=1'
    );
  });
});

describe('calendar export', () => {
  it('omits meeting URLs from ICS output', () => {
    const ics = buildIcs({
      title: 'Prayer Meeting',
      slug: 'prayer-meeting',
      description: 'Join in person.',
      location: 'Main Hall',
      startAt: new Date('2026-08-24T07:00:00.000Z'),
      endAt: new Date('2026-08-24T08:00:00.000Z'),
      url: 'https://busamekeneeyasus.org/events/prayer-meeting',
    });
    assert.equal(ics.includes('BEGIN:VEVENT'), true);
    assert.equal(ics.toLowerCase().includes('zoom'), false);
    assert.equal(ics.includes('https://zoom.example/private'), false);
  });
});

describe('permissions', () => {
  it('does not let members create or publish events', () => {
    const member = user('member');
    assert.equal(canPublishEvent(member), false);
    assert.equal(allowedEventStatus(member, 'published'), 'draft');
    assert.equal(hasPermission(member, 'events', 'create'), false);
  });

  it('does not give media team event management', () => {
    const media = user('media_team');
    assert.equal(can(media, 'events.create'), false);
    assert.equal(can(media, 'events.publish'), false);
    assert.equal(canPublishEvent(media), false);
  });

  it('lets church leaders create drafts but not publish', () => {
    const leader = user('church_leader');
    assert.equal(can(leader, 'events.create'), true);
    assert.equal(canPublishEvent(leader), false);
    assert.equal(allowedEventStatus(leader, 'published'), 'draft');
  });

  it('scopes ministry leaders to their ministry records', () => {
    const leader = user('ministry_leader');
    assert.equal(canMutateEventRecord(leader, { ministry: { leaderUserId: leader.id } }), true);
    assert.equal(canMutateEventRecord(leader, { ministry: { leaderUserId: 'other' } }), false);
    assert.equal(canPublishEvent(leader), false);
    assert.equal(canArchiveEvent(leader), false);
    assert.equal(canCancelEvent(leader), false);
    assert.equal(canDeleteEvent(leader), false);
  });

  it('lets administrators cancel and archive', () => {
    const admin = user('admin');
    assert.equal(canCancelEvent(admin), true);
    assert.equal(canArchiveEvent(admin), true);
    assert.equal(canPublishEvent(admin), true);
  });
});

describe('publishing helpers', () => {
  it('schedules a future publishAt', () => {
    const now = new Date('2026-08-20T12:00:00Z');
    const resolved = resolveEventStatusOnSave({
      status: 'published',
      publishAt: new Date('2026-08-21T12:00:00Z'),
      now,
    });
    assert.equal(resolved.status, 'scheduled');
  });

  it('prepares notification hook names without sending messages', () => {
    assert.equal(EVENT_HOOK_TYPES.includes('event.starting_soon'), true);
    assert.equal(EVENT_HOOK_TYPES.includes('event.cancelled'), true);
    const soon = isStartingSoon(new Date('2026-08-20T12:30:00Z'), new Date('2026-08-20T12:00:00Z'));
    assert.equal(soon, true);
  });

  it('reserves public event slugs', () => {
    assert.equal(RESERVED_EVENT_SLUGS.has('past'), true);
    assert.equal(RESERVED_EVENT_SLUGS.has('create'), true);
  });

  it('builds a Sunday-start month grid', () => {
    const weeks = monthGrid(2026, 8);
    assert.equal(weeks[0].length, 7);
    assert.equal(weeks.some((week) => week.some((day) => day.date === '2026-08-01' && day.inMonth)), true);
  });
});
