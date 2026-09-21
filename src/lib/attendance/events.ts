import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { notifyFromChurchEvent } from '@/lib/communications/service';

export type AttendanceEventType =
  | 'attendance.session_created'
  | 'attendance.session_updated'
  | 'attendance.session_opened'
  | 'attendance.session_closed'
  | 'attendance.session_archived'
  | 'attendance.record_created'
  | 'attendance.record_corrected'
  | 'attendance.record_removed'
  | 'attendance.qr_generated'
  | 'attendance.qr_invalidated'
  | 'attendance.exported'
  | 'attendance.check_in';

const SENSITIVE = /password|token|secret|hash/i;

export async function emitAttendanceEvent(input: {
  type: AttendanceEventType;
  userId?: string | null;
  entityId?: string | null;
  request?: Request;
  details?: Record<string, unknown>;
}) {
  const details: Record<string, unknown> = { event: input.type };
  if (input.details) {
    for (const [key, value] of Object.entries(input.details)) {
      if (SENSITIVE.test(key)) continue;
      details[key] = value;
    }
  }

  await logSecurityEvent({
    action: input.type.split('.').pop() || input.type,
    entity: 'attendance',
    entityId: input.entityId ?? undefined,
    userId: input.userId ?? undefined,
    ipAddress: input.request ? getClientIp(input.request) : undefined,
    details,
  });

  if (
    (input.type === 'attendance.session_opened' ||
      input.type === 'attendance.session_closed') &&
    input.userId
  ) {
    const opened = input.type === 'attendance.session_opened';
    await notifyFromChurchEvent({
      type: input.type,
      userId: input.userId,
      entityId: input.entityId,
      title: opened ? 'Attendance session opened' : 'Attendance session closed',
      message: opened
        ? 'The attendance session is now open for check-in.'
        : 'The attendance session has been closed.',
      relatedUrl: input.entityId
        ? `/admin/attendance/sessions/${input.entityId}`
        : '/admin/attendance',
      notificationType: 'attendance_notice',
      transactional: true,
      channels: ['in_app'],
    });
  }
}
