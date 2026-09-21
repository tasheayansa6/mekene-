import { db } from '@/lib/db';
import { badRequest, forbidden, success } from '@/lib/api/response';
import { guardAdminWrite } from '@/lib/admin/guard';
import { readJson } from '@/lib/auth/http';
import { canApproveGovernance } from '@/lib/governance/access';
import { createDelegation, recordApprovalAction } from '@/lib/governance/approvals';

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'governance', 'approve');
  if (!auth.ok) return auth.error;
  if (!canApproveGovernance(auth.user)) return forbidden();

  const body = (await readJson(request)) as Record<string, unknown> | null;
  if (!body || typeof body.type !== 'string') {
    return badRequest('type is required (approval | delegation).');
  }

  if (body.type === 'delegation') {
    if (typeof body.toUserId !== 'string') {
      return badRequest('toUserId is required for delegation.');
    }
    try {
      const row = await createDelegation({
        fromUser: auth.user,
        toUserId: body.toUserId,
        workflowId: typeof body.workflowId === 'string' ? body.workflowId : null,
        scope: typeof body.scope === 'string' ? body.scope : null,
        startAt:
          typeof body.startAt === 'string' ? new Date(body.startAt) : undefined,
        endAt:
          typeof body.endAt === 'string'
            ? new Date(body.endAt)
            : body.endAt === null
              ? null
              : undefined,
        request,
      });
      return success(
        {
          id: row.id,
          fromUserId: row.fromUserId,
          toUserId: row.toUserId,
          workflowId: row.workflowId,
          scope: row.scope,
          startAt: row.startAt.toISOString(),
          endAt: row.endAt?.toISOString() ?? null,
        },
        'Delegation created.',
        201
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'CANNOT_DELEGATE';
      return forbidden(message);
    }
  }

  if (body.type === 'approval') {
    if (typeof body.workflowId !== 'string') {
      return badRequest('workflowId is required.');
    }
    if (typeof body.entityType !== 'string' || typeof body.entityId !== 'string') {
      return badRequest('entityType and entityId are required.');
    }
    if (typeof body.action !== 'string') {
      return badRequest('action is required.');
    }

    try {
      const row = await recordApprovalAction({
        workflowId: body.workflowId,
        stepId: typeof body.stepId === 'string' ? body.stepId : null,
        entityType: body.entityType,
        entityId: body.entityId,
        actor: auth.user,
        action: body.action as
          | 'approve'
          | 'reject'
          | 'request_changes'
          | 'comment'
          | 'delegate',
        comment: typeof body.comment === 'string' ? body.comment : null,
        request,
      });
      return success(
        {
          id: row.id,
          workflowId: row.workflowId,
          entityType: row.entityType,
          entityId: row.entityId,
          action: row.action,
        },
        'Approval action recorded.',
        201
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'APPROVAL_FORBIDDEN';
      if (message === 'APPROVAL_FORBIDDEN' || message === 'DELEGATION_SCOPE_EXCEEDED') {
        return forbidden(message);
      }
      return badRequest(message);
    }
  }

  return badRequest('type must be approval or delegation.');
}
