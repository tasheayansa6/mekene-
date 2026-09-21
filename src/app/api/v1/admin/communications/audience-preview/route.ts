import { z } from 'zod';
import { forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canSendCommunications } from '@/lib/communications/access';
import { previewAudience } from '@/lib/communications/audience-preview';

const previewSchema = z.object({
  audience: z.enum([
    'everyone',
    'members',
    'ministry',
    'ministry_leaders',
    'staff',
    'volunteers',
    'event_registrants',
  ]),
  ministryId: z.string().trim().nullable().optional(),
  eventId: z.string().trim().nullable().optional(),
  householdId: z.string().trim().nullable().optional(),
  channels: z.array(z.enum(['in_app', 'email', 'telegram', 'sms'])).min(1),
  notificationType: z
    .enum([
      'announcement',
      'news',
      'notice',
      'event_reminder',
      'ministry_update',
      'membership_update',
      'attendance_notice',
      'giving_notification',
      'system',
    ])
    .optional(),
  transactional: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'communications', 'assign');
  if (!auth.ok) return auth.error;
  if (!canSendCommunications(auth.user)) return forbidden();

  const parsed = previewSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const data = parsed.data;
  if (
    (data.audience === 'ministry' || data.audience === 'ministry_leaders') &&
    !data.ministryId
  ) {
    return validationError({ ministryId: ['Ministry is required for this audience.'] });
  }
  if (data.audience === 'event_registrants' && !data.eventId) {
    return validationError({ eventId: ['Event is required for event registrants audience.'] });
  }

  const preview = await previewAudience({
    audience: data.audience,
    ministryId: data.ministryId ?? null,
    eventId: data.eventId ?? null,
    householdId: data.householdId ?? null,
    channels: data.channels,
    notificationType: data.notificationType,
    transactional: data.transactional,
  });

  return success({ preview });
}
