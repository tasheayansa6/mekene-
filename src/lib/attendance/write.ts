import { db } from '@/lib/db';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { isCurrentMember } from '@/lib/members/status';
import { isSessionAcceptingCheckIns } from './status';

export async function requireActiveMemberForUser(userId: string) {
  const member = await db.member.findUnique({ where: { userId } });
  if (!member || !isCurrentMember(member.status)) {
    return null;
  }
  return member;
}

export async function createCheckInRecord(input: {
  sessionId: string;
  memberId: string;
  method: 'manual' | 'self' | 'admin' | 'qr' | 'imported';
  status?: 'present' | 'late' | 'absent' | 'excused' | 'cancelled';
  recordedById?: string | null;
  checkInAt?: Date | null;
  notes?: string | null;
}) {
  const existing = await db.attendanceRecord.findUnique({
    where: {
      sessionId_memberId: {
        sessionId: input.sessionId,
        memberId: input.memberId,
      },
    },
  });
  if (existing) {
    return { ok: false as const, reason: 'already_checked_in' as const, record: existing };
  }

  const record = await db.attendanceRecord.create({
    data: {
      sessionId: input.sessionId,
      memberId: input.memberId,
      status: input.status || 'present',
      method: input.method,
      checkInAt: input.checkInAt ?? new Date(),
      recordedById: input.recordedById ?? null,
      notes: input.notes ?? null,
    },
  });
  return { ok: true as const, record };
}

export async function issueSessionQrToken(input: {
  sessionId: string;
  createdById: string;
  ttlMinutes: number;
}) {
  const raw = generateToken(24);
  const expiresAt = new Date(Date.now() + input.ttlMinutes * 60_000);
  await db.attendanceQrToken.create({
    data: {
      sessionId: input.sessionId,
      tokenHash: hashToken(raw),
      expiresAt,
      createdById: input.createdById,
    },
  });
  return { token: raw, expiresAt };
}

export async function validateSessionQrToken(rawToken: string) {
  const record = await db.attendanceQrToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { session: true },
  });
  if (!record || record.revokedAt) {
    return { ok: false as const, reason: 'invalid' as const };
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, reason: 'expired' as const };
  }
  if (!isSessionAcceptingCheckIns(record.session) || !record.session.allowQrCheckIn) {
    return { ok: false as const, reason: 'closed' as const, session: record.session };
  }
  return { ok: true as const, session: record.session, tokenId: record.id };
}

export function snapshotRecord(record: {
  status: string;
  method: string;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  notes: string | null;
  memberId: string;
}) {
  return JSON.stringify({
    status: record.status,
    method: record.method,
    checkInAt: record.checkInAt?.toISOString() ?? null,
    checkOutAt: record.checkOutAt?.toISOString() ?? null,
    notes: record.notes,
    memberId: record.memberId,
  });
}
