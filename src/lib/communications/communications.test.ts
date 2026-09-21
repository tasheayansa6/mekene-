import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sanitizeRelatedUrl, sanitizeNotificationData } from './sanitize';
import { allowsChannel } from './audience';
import { communicationBackoffMs } from './backoff';
import {
  canSendBulkCommunications,
  canCreateCommunications,
  canModerateMessages,
  canSendEmergency,
  isMinistryScopedCommunicator,
} from './access';
import {
  extractTemplateVariables,
  renderTemplate,
  validateTemplateVariables,
} from './templates';
import type { AuthUser } from '@/lib/auth/permissions';
import type { NotificationPreference } from '@prisma/client';

function user(slug: string, permissions: Array<{ resource: string; action: string }>): AuthUser {
  return {
    id: 'u1',
    email: 't@example.com',
    firstName: 'T',
    lastName: 'U',
    status: 'active',
    isVerified: true,
    role: { id: 'r1', slug, name: slug, hierarchy: 10, isPrivileged: false },
    permissions,
  } as AuthUser;
}

describe('communications sanitize', () => {
  it('blocks javascript URLs', () => {
    assert.equal(sanitizeRelatedUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeRelatedUrl('/member/notifications'), '/member/notifications');
  });

  it('strips sensitive notification data keys', () => {
    const raw = sanitizeNotificationData({
      password: 'x',
      token: 'y',
      title: 'ok',
    });
    assert.ok(raw);
    const parsed = JSON.parse(raw!);
    assert.equal(parsed.password, undefined);
    assert.equal(parsed.token, undefined);
    assert.equal(parsed.title, 'ok');
  });
});

describe('communications preferences', () => {
  const prefs = {
    id: 'p1',
    userId: 'u1',
    emailAnnouncements: false,
    emailEvents: true,
    emailMinistry: true,
    emailMarketing: false,
    inAppGeneral: true,
    inAppEvents: false,
    inAppMembership: true,
    telegramEnabled: false,
    smsEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies NotificationPreference;

  it('always allows transactional channels', () => {
    assert.equal(allowsChannel(prefs, 'giving_notification', 'email', true), true);
    assert.equal(allowsChannel(prefs, 'membership_update', 'in_app', true), true);
    assert.equal(allowsChannel(prefs, 'announcement', 'telegram', true), true);
    assert.equal(allowsChannel(prefs, 'announcement', 'sms', true), true);
  });

  it('respects optional announcement email preference', () => {
    assert.equal(allowsChannel(prefs, 'announcement', 'email', false), false);
  });

  it('respects telegram and sms opt-in preferences', () => {
    assert.equal(allowsChannel(prefs, 'announcement', 'telegram', false), false);
    assert.equal(allowsChannel(prefs, 'announcement', 'sms', false), false);
    const optedIn = { ...prefs, telegramEnabled: true, smsEnabled: true };
    assert.equal(allowsChannel(optedIn, 'announcement', 'telegram', false), true);
    assert.equal(allowsChannel(optedIn, 'announcement', 'sms', false), true);
  });
});

describe('communications access', () => {
  it('denies members from creating announcements or bulk send', () => {
    const member = user('member', [{ resource: 'profile', action: 'view' }]);
    assert.equal(canCreateCommunications(member), false);
    assert.equal(canSendBulkCommunications(member), false);
  });

  it('scopes ministry leaders without manage', () => {
    const leader = user('ministry_leader', [
      { resource: 'communications', action: 'view' },
      { resource: 'communications', action: 'create' },
      { resource: 'communications', action: 'assign' },
    ]);
    assert.equal(isMinistryScopedCommunicator(leader), true);
    assert.equal(canSendBulkCommunications(leader), false);
  });

  it('allows admin bulk send', () => {
    const admin = user('admin', [{ resource: 'communications', action: 'manage' }]);
    assert.equal(canSendBulkCommunications(admin), true);
  });
});

describe('communications retry backoff', () => {
  it('grows exponentially and caps', () => {
    assert.equal(communicationBackoffMs(1), 30_000);
    assert.equal(communicationBackoffMs(2), 60_000);
    assert.ok(communicationBackoffMs(20) <= 60 * 60_000);
  });
});

describe('communications templates', () => {
  it('renders allowlisted variables only', () => {
    const body = 'Hello {{member_name}}, see you at {{venue}} on {{unknown}}';
    assert.equal(
      renderTemplate(body, { member_name: 'Jane', venue: 'Main Hall' }),
      'Hello Jane, see you at Main Hall on {{unknown}}'
    );
  });

  it('extracts and validates template variables', () => {
    assert.deepEqual(extractTemplateVariables('Hi {{member_name}} at {{church_name}}'), [
      'member_name',
      'church_name',
    ]);
    assert.equal(validateTemplateVariables('Hi {{member_name}}').ok, true);
    const invalid = validateTemplateVariables('Hi {{bad_var}}');
    assert.equal(invalid.ok, false);
    if (!invalid.ok) assert.deepEqual(invalid.unknown, ['bad_var']);
  });
});

describe('communications emergency access', () => {
  it('allows emergency send for communications manage only', () => {
    const admin = user('admin', [{ resource: 'communications', action: 'manage' }]);
    const assignee = user('pastor', [{ resource: 'communications', action: 'assign' }]);
    assert.equal(canSendEmergency(admin), true);
    assert.equal(canSendEmergency(assignee), false);
    assert.equal(canModerateMessages(admin), true);
  });
});
