import { getClientIp, logSecurityEvent } from '@/lib/auth/audit';
import { notifyFromChurchEvent } from '@/lib/communications/service';

export type FinanceEventType =
  | 'finance.expense_created'
  | 'finance.expense_submitted'
  | 'finance.expense_approved'
  | 'finance.expense_rejected'
  | 'finance.expense_paid'
  | 'finance.expense_cancelled'
  | 'finance.budget_created'
  | 'finance.budget_updated'
  | 'finance.reconciliation_created'
  | 'finance.reconciliation_closed'
  | 'finance.schedule_created'
  | 'finance.schedule_cancelled'
  | 'finance.exported';

const SENSITIVE = /password|secret|token|card|cvv|pan|authorization|providerKey|apiKey/i;

const GENERIC_MESSAGES: Partial<
  Record<FinanceEventType, { title: string; message: string }>
> = {
  'finance.expense_submitted': {
    title: 'Expense submitted',
    message: 'An expense was submitted for review.',
  },
  'finance.expense_approved': {
    title: 'Expense approved',
    message: 'An expense was approved.',
  },
  'finance.expense_rejected': {
    title: 'Expense rejected',
    message: 'An expense was rejected.',
  },
  'finance.expense_paid': {
    title: 'Expense paid',
    message: 'An expense payment was recorded.',
  },
  'finance.reconciliation_closed': {
    title: 'Reconciliation closed',
    message: 'A financial reconciliation period was closed.',
  },
};

export async function emitFinanceEvent(input: {
  type: FinanceEventType;
  userId?: string | null;
  entityId?: string | null;
  request?: Request;
  details?: Record<string, unknown>;
  notifyUserId?: string | null;
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
    entity: 'finance',
    entityId: input.entityId ?? undefined,
    userId: input.userId ?? undefined,
    ipAddress: input.request ? getClientIp(input.request) : undefined,
    details,
  });

  const notify = GENERIC_MESSAGES[input.type];
  if (notify && input.notifyUserId) {
    await notifyFromChurchEvent({
      type: input.type,
      userId: input.notifyUserId,
      entityId: input.entityId,
      title: notify.title,
      message: notify.message,
      relatedUrl: '/admin/finance',
      notificationType: 'system',
      transactional: true,
      channels: ['in_app'],
    });
  }
}
