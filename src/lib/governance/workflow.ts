import { MINUTES_STATUSES, POLICY_STATUSES, ADMIN_REQUEST_STATUSES } from './status';

/** Server-side workflow transitions — never trust client status jumps. */

const MINUTES_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['secretary_review'],
  secretary_review: ['chair_review', 'draft'],
  chair_review: ['approved', 'secretary_review'],
  approved: ['locked', 'amendment_pending'],
  locked: ['amendment_pending'],
  amendment_pending: ['secretary_review', 'draft'],
};

const POLICY_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['review'],
  review: ['approval', 'draft'],
  approval: ['published', 'review'],
  published: ['archived'],
  archived: [],
};

const REQUEST_TRANSITIONS: Record<string, readonly string[]> = {
  submitted: ['assigned', 'cancelled'],
  assigned: ['under_review', 'cancelled'],
  under_review: ['approved', 'rejected', 'assigned'],
  approved: ['completed'],
  rejected: [],
  completed: [],
  cancelled: [],
};

export function canTransitionMinutes(from: string, to: string): boolean {
  return (MINUTES_TRANSITIONS[from] ?? []).includes(to);
}

export function canTransitionPolicy(from: string, to: string): boolean {
  return (POLICY_TRANSITIONS[from] ?? []).includes(to);
}

export function canTransitionRequest(from: string, to: string): boolean {
  return (REQUEST_TRANSITIONS[from] ?? []).includes(to);
}

export function minutesAreImmutable(status: string): boolean {
  return status === 'approved' || status === 'locked';
}

export function policyVersionIsImmutable(status: string): boolean {
  return status === 'published' || status === 'archived';
}

export function assertMinutesEditable(status: string): void {
  if (minutesAreImmutable(status)) {
    throw new Error('MINUTES_LOCKED');
  }
}

export function assertPolicyVersionEditable(status: string): void {
  if (policyVersionIsImmutable(status)) {
    throw new Error('POLICY_VERSION_LOCKED');
  }
}

export { MINUTES_STATUSES, POLICY_STATUSES, ADMIN_REQUEST_STATUSES };
