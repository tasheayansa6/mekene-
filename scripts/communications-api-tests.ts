/**
 * Phase 16/24 communications anonymous security checks.
 * APP_URL=http://localhost:3000 npx tsx scripts/communications-api-tests.ts
 */

const base = process.env.APP_URL || 'http://localhost:3000';

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, options);
  const text = await res.text();
  let json: { success: boolean; message: string | null } | null = null;
  try {
    json = JSON.parse(text) as { success: boolean; message: string | null };
  } catch {
    json = { success: false, message: text.slice(0, 120) };
  }
  return { status: res.status, json };
}

function fail(message: string): never {
  throw new Error(message);
}

async function main() {
  const notifications = await req('/api/v1/notifications');
  if (notifications.status !== 401) {
    fail(`anonymous notifications must be 401, got ${notifications.status}`);
  }

  const memberNotifications = await req('/api/v1/member/notifications');
  if (memberNotifications.status !== 401) {
    fail(`anonymous member notifications must be 401, got ${memberNotifications.status}`);
  }

  const prefs = await req('/api/v1/notification-preferences');
  if (prefs.status !== 401) {
    fail(`anonymous preferences must be 401, got ${prefs.status}`);
  }

  const overview = await req('/api/v1/admin/communications/overview');
  if (overview.status !== 401) {
    fail(`anonymous admin overview must be 401, got ${overview.status}`);
  }

  const send = await req('/api/v1/admin/communications/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'x', message: 'y', audience: 'members' }),
  });
  if (send.status !== 401 && send.status !== 403) {
    fail(`anonymous send must be blocked, got ${send.status}`);
  }

  const emergency = await req('/api/v1/admin/communications/emergency', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'x',
      message: 'y',
      audience: 'everyone',
      channels: ['in_app'],
      confirm: true,
      confirmText: 'SEND EMERGENCY',
    }),
  });
  if (emergency.status !== 401 && emergency.status !== 403) {
    fail(`anonymous emergency must be blocked, got ${emergency.status}`);
  }

  const preview = await req('/api/v1/admin/communications/audience-preview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ audience: 'members', channels: ['in_app'] }),
  });
  if (preview.status !== 401 && preview.status !== 403) {
    fail(`anonymous audience preview must be blocked, got ${preview.status}`);
  }

  const messages = await req('/api/v1/member/messages');
  if (messages.status !== 401) {
    fail(`anonymous member messages must be 401, got ${messages.status}`);
  }

  const adminMessages = await req('/api/v1/admin/messages');
  if (adminMessages.status !== 401 && adminMessages.status !== 403) {
    fail(`anonymous admin messages must be blocked, got ${adminMessages.status}`);
  }

  const delivery = await req('/api/v1/admin/communications/delivery');
  if (delivery.status !== 401) {
    fail(`anonymous delivery must be 401, got ${delivery.status}`);
  }

  const emailHook = await req('/api/v1/webhooks/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ providerReference: 'x', status: 'delivered' }),
  });
  if (emailHook.status !== 401 && emailHook.status !== 403 && emailHook.status !== 503) {
    fail(`unauthenticated email webhook must be 401/403/503, got ${emailHook.status}`);
  }

  const announcements = await req('/api/v1/announcements');
  if (announcements.status !== 200) {
    fail(`public announcements should be 200, got ${announcements.status}`);
  }

  console.log('Communications API anonymous security checks passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
