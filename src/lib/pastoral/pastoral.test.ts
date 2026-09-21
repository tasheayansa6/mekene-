import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessCase,
  canManageNotes,
  canViewPastoral,
  caseListWhere,
} from './access';
import { PASTORAL_GENERIC_NOTIFY_MESSAGE } from './events';
import { serializeCase, serializeCaseForReport, serializeNote } from './serialize';
import { validateAvailabilitySlot } from './appointments';
import { serializeMemberCase, serializeMemberVisit } from './member-care';
import { permissionsForRole } from '../auth/rbac-matrix';
import type { AuthUser } from '../auth/permissions';

function user(slug: string, id = `${slug}-1`): AuthUser {
  return {
    id,
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
      id: `role-${slug}`,
      slug,
      name: slug,
      hierarchy: 10,
      isPrivileged: slug === 'admin' || slug === 'super_admin',
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('pastoral access scoping', () => {
  it('admin with view only sees assigned or created cases', () => {
    const admin = user('admin');
    assert.equal(canViewPastoral(admin), true);
    const where = caseListWhere(admin);
    assert.deepEqual(where, {
      OR: [{ assignedToId: admin.id }, { createdById: admin.id }],
    });

    assert.equal(
      canAccessCase(admin, { assignedToId: admin.id, createdById: 'other' }),
      true
    );
    assert.equal(
      canAccessCase(admin, { assignedToId: 'someone-else', createdById: admin.id }),
      true
    );
    assert.equal(
      canAccessCase(admin, { assignedToId: 'other', createdById: 'other' }),
      false
    );
  });

  it('pastor/manage can see all cases', () => {
    const pastor = user('pastor');
    assert.deepEqual(caseListWhere(pastor), {});
    assert.equal(
      canAccessCase(pastor, { assignedToId: 'x', createdById: 'y' }),
      true
    );
  });

  it('admin cannot manage notes; pastor can', () => {
    assert.equal(canManageNotes(user('admin')), false);
    assert.equal(canManageNotes(user('pastor')), true);
    assert.equal(canManageNotes(user('super_admin')), true);
  });
});

describe('pastoral privacy', () => {
  it('generic notification copy has no confidential words', () => {
    const message = PASTORAL_GENERIC_NOTIFY_MESSAGE.toLowerCase();
    for (const word of ['note', 'summary', 'confession', 'diagnosis', 'counseling']) {
      assert.equal(message.includes(word), false, `unexpected word: ${word}`);
    }
    assert.match(PASTORAL_GENERIC_NOTIFY_MESSAGE, /care team/i);
  });

  it('report serializer omits summary and never includes notes content', () => {
    const row = {
      id: 'c1',
      memberId: 'm1',
      categoryId: null,
      title: 'Confidential title',
      summary: 'Private medical details must not leak',
      priority: 'high',
      status: 'open',
      assignedToId: null,
      createdById: 'u1',
      openedAt: new Date(),
      closedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const reported = serializeCaseForReport(row);
    assert.equal('summary' in reported, false);
    assert.equal('notes' in reported, false);
    assert.equal('content' in reported, false);

    const listed = serializeCase(row);
    assert.equal(listed.summary, 'Private medical details must not leak');
    assert.equal('notes' in listed, false);
  });

  it('note serializer is only used when explicitly allowed', () => {
    const note = serializeNote({
      id: 'n1',
      caseId: 'c1',
      authorId: 'a1',
      content: 'Sensitive pastoral note body',
      visibility: 'case_team',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    assert.equal(note.content, 'Sensitive pastoral note body');
  });
});

describe('Phase 30 care appointments & member serializers', () => {
  it('validates availability slots', () => {
    assert.equal(
      validateAvailabilitySlot({ weekday: 1, startTime: '09:00', endTime: '12:00' }),
      null
    );
    assert.match(
      validateAvailabilitySlot({ weekday: 9, startTime: '09:00', endTime: '12:00' }) || '',
      /weekday/
    );
    assert.match(
      validateAvailabilitySlot({ weekday: 1, startTime: '12:00', endTime: '09:00' }) || '',
      /endTime/
    );
  });

  it('member case serializer never exposes summary or notes', () => {
    const row = serializeMemberCase({
      id: 'c1',
      title: 'Need prayer support',
      status: 'open',
      openedAt: new Date(),
      closedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: { name: 'Counseling' },
    });
    assert.equal(row.title, 'Need prayer support');
    assert.equal('summary' in row, false);
    assert.equal('notes' in row, false);
    assert.equal(row.category?.name, 'Counseling');
  });

  it('member visit serializer omits internal notes', () => {
    const row = serializeMemberVisit({
      id: 'v1',
      scheduledAt: new Date('2026-09-22T10:00:00Z'),
      completedAt: null,
      status: 'scheduled',
      locationType: 'church',
      locationNote: 'Room 2',
      assignedTo: { id: 'u1', firstName: 'Abebe', lastName: 'Kebede' },
    });
    assert.equal(row.locationNote, 'Room 2');
    assert.equal('notes' in row, false);
    assert.equal(row.assignedTo?.name, 'Abebe Kebede');
  });
});
