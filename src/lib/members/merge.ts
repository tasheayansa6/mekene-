import { db } from '@/lib/db';
import { recordStatusHistory } from './write';
import { emitMembershipEvent } from './events';

export class MergeError extends Error {
  constructor(
    public code: 'not_found' | 'same' | 'conflict' | 'unauthorized',
    message: string
  ) {
    super(message);
  }
}

/** Preview conflicts before merging source into target (canonical). */
export async function previewMemberMerge(sourceId: string, targetId: string) {
  if (sourceId === targetId) throw new MergeError('same', 'Cannot merge a member into itself.');
  const [source, target] = await Promise.all([
    db.member.findUnique({
      where: { id: sourceId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: {
          select: {
            attendance: true,
            contributions: true,
            ministries: true,
            documents: true,
            applications: true,
          },
        },
      },
    }),
    db.member.findUnique({
      where: { id: targetId },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: {
          select: {
            attendance: true,
            contributions: true,
            ministries: true,
            documents: true,
            applications: true,
          },
        },
      },
    }),
  ]);
  if (!source || !target) throw new MergeError('not_found', 'Member not found.');

  const conflicts: string[] = [];
  if (source.userId === target.userId) conflicts.push('Both already linked to the same user.');
  if (source.membershipNumber && target.membershipNumber && source.membershipNumber !== target.membershipNumber) {
    conflicts.push('Different membership numbers — target keeps its number.');
  }
  if (source.householdId && target.householdId && source.householdId !== target.householdId) {
    conflicts.push('Different households — target household retained; source household link cleared.');
  }

  return {
    source: {
      id: source.id,
      membershipNumber: source.membershipNumber,
      status: source.status,
      user: source.user,
      counts: source._count,
    },
    target: {
      id: target.id,
      membershipNumber: target.membershipNumber,
      status: target.status,
      user: target.user,
      counts: target._count,
    },
    conflicts,
  };
}

/**
 * Merge source into target: reassign related records, archive source.
 * Does not delete financial rows or invent duplicates.
 */
export async function mergeMembers(input: {
  sourceId: string;
  targetId: string;
  performedById: string;
  notes?: string | null;
  request?: Request;
}) {
  const preview = await previewMemberMerge(input.sourceId, input.targetId);

  await db.$transaction(async (tx) => {
    const sourceAttendance = await tx.attendanceRecord.findMany({ where: { memberId: input.sourceId } });
    const targetSessions = await tx.attendanceRecord.findMany({
      where: { memberId: input.targetId },
      select: { sessionId: true },
    });
    const targetSessionIds = new Set(targetSessions.map((r) => r.sessionId));
    for (const row of sourceAttendance) {
      if (targetSessionIds.has(row.sessionId)) {
        await tx.attendanceRecord.delete({ where: { id: row.id } });
      } else {
        await tx.attendanceRecord.update({
          where: { id: row.id },
          data: { memberId: input.targetId },
        });
      }
    }
    // Skip ministry links that would violate unique(memberId, ministryId)
    const sourceMinistries = await tx.memberMinistry.findMany({ where: { memberId: input.sourceId } });
    const targetMinistries = await tx.memberMinistry.findMany({
      where: { memberId: input.targetId },
      select: { ministryId: true },
    });
    const targetMinistryIds = new Set(targetMinistries.map((m) => m.ministryId));
    for (const row of sourceMinistries) {
      if (targetMinistryIds.has(row.ministryId)) {
        await tx.memberMinistry.delete({ where: { id: row.id } });
      } else {
        await tx.memberMinistry.update({
          where: { id: row.id },
          data: { memberId: input.targetId },
        });
      }
    }
    await tx.membershipApplication.updateMany({
      where: { memberId: input.sourceId },
      data: { memberId: input.targetId },
    });
    await tx.memberDocument.updateMany({
      where: { memberId: input.sourceId },
      data: { memberId: input.targetId },
    });
    await tx.memberAdminNote.updateMany({
      where: { memberId: input.sourceId },
      data: { memberId: input.targetId },
    });
    await tx.baptismRecord.updateMany({
      where: { memberId: input.sourceId },
      data: { memberId: input.targetId },
    });
    await tx.confirmationRecord.updateMany({
      where: { memberId: input.sourceId },
      data: { memberId: input.targetId },
    });
    await tx.membershipTransfer.updateMany({
      where: { memberId: input.sourceId },
      data: { memberId: input.targetId },
    });
    await tx.serviceAssignment.updateMany({
      where: { memberId: input.sourceId },
      data: { memberId: input.targetId },
    });
    // Contributions/pledges: re-point member FK only; never delete financial rows
    await tx.contribution.updateMany({
      where: { memberId: input.sourceId },
      data: { memberId: input.targetId },
    });
    await tx.pledge.updateMany({
      where: { memberId: input.sourceId },
      data: { memberId: input.targetId },
    });

    await tx.member.update({
      where: { id: input.sourceId },
      data: {
        status: 'archived',
        archivedAt: new Date(),
        householdId: null,
      },
    });

    await tx.memberMergeRecord.create({
      data: {
        sourceMemberId: input.sourceId,
        targetMemberId: input.targetId,
        performedById: input.performedById,
        notes: input.notes || null,
        conflictSummary: preview.conflicts.join('; ') || null,
      },
    });
  });

  await recordStatusHistory({
    memberId: input.sourceId,
    oldStatus: preview.source.status,
    newStatus: 'archived',
    changedById: input.performedById,
    reason: `Merged into ${preview.target.membershipNumber || input.targetId}`,
  });

  await emitMembershipEvent({
    type: 'membership.merged',
    userId: input.performedById,
    entityId: input.targetId,
    request: input.request,
    details: { sourceId: input.sourceId, targetId: input.targetId },
  });

  return preview;
}
