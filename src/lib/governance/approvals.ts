import { db } from '@/lib/db';
import type { AuthUser } from '@/lib/auth/permissions';
import { canApproveGovernance, isGlobalGovernanceAdmin } from './access';
import { emitGovernanceEvent } from './events';

/**
 * Record an approval action. Duplicate (entity, step, actor, action) is blocked by DB unique.
 * Delegation: actor may act if they hold permission OR an active delegation from a permitted user.
 */
export async function recordApprovalAction(input: {
  workflowId: string;
  stepId?: string | null;
  entityType: string;
  entityId: string;
  actor: AuthUser;
  action: 'approve' | 'reject' | 'request_changes' | 'comment' | 'delegate';
  comment?: string | null;
  request?: Request;
}) {
  if (!canApproveGovernance(input.actor) && !isGlobalGovernanceAdmin(input.actor)) {
    const now = new Date();
    const delegation = await db.approvalDelegation.findFirst({
      where: {
        toUserId: input.actor.id,
        isActive: true,
        startAt: { lte: now },
        AND: [
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
          { OR: [{ workflowId: input.workflowId }, { workflowId: null }] },
        ],
      },
    });
    if (!delegation) {
      throw new Error('APPROVAL_FORBIDDEN');
    }
    // Delegates cannot exceed scope string if set
    if (delegation.scope && !delegation.scope.split(',').includes(input.entityType)) {
      throw new Error('DELEGATION_SCOPE_EXCEEDED');
    }
  }

  const created = await db.approvalAction.create({
    data: {
      workflowId: input.workflowId,
      stepId: input.stepId ?? null,
      entityType: input.entityType as never,
      entityId: input.entityId,
      actorId: input.actor.id,
      action: input.action as never,
      comment: input.comment ?? null,
    },
  });

  await emitGovernanceEvent({
    type: 'approval_action',
    actorId: input.actor.id,
    entityId: created.id,
    request: input.request,
    details: { entityType: input.entityType, entityId: input.entityId, action: input.action },
  });

  return created;
}

export async function createDelegation(input: {
  fromUser: AuthUser;
  toUserId: string;
  workflowId?: string | null;
  scope?: string | null;
  startAt?: Date;
  endAt?: Date | null;
  request?: Request;
}) {
  if (!canApproveGovernance(input.fromUser) && !isGlobalGovernanceAdmin(input.fromUser)) {
    throw new Error('CANNOT_DELEGATE');
  }

  const row = await db.approvalDelegation.create({
    data: {
      fromUserId: input.fromUser.id,
      toUserId: input.toUserId,
      workflowId: input.workflowId ?? null,
      scope: input.scope ?? null,
      startAt: input.startAt ?? new Date(),
      endAt: input.endAt ?? null,
      isActive: true,
    },
  });

  await emitGovernanceEvent({
    type: 'delegation_created',
    actorId: input.fromUser.id,
    entityId: row.id,
    recipientUserId: input.toUserId,
    request: input.request,
  });

  return row;
}
