export const CONTRIBUTION_STATUSES = [
  'pending',
  'processing',
  'successful',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
] as const;
export type ContributionStatusValue = (typeof CONTRIBUTION_STATUSES)[number];

export const PAYMENT_METHODS = ['online', 'bank_transfer', 'cash', 'other'] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const CAMPAIGN_STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'] as const;
export type CampaignStatusValue = (typeof CAMPAIGN_STATUSES)[number];

export const PLEDGE_FREQUENCIES = ['one_time', 'monthly', 'quarterly', 'yearly'] as const;
export type PledgeFrequencyValue = (typeof PLEDGE_FREQUENCIES)[number];

export const PLEDGE_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'] as const;

export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatusValue, string> = {
  pending: 'Pending',
  processing: 'Processing',
  successful: 'Successful',
  failed: 'Failed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  online: 'Online payment',
  bank_transfer: 'Bank transfer',
  cash: 'Cash',
  other: 'Other',
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatusValue, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
};

/** Only successful (and net of partial refunds) count toward raised totals. */
export function countsTowardTotals(status: string): boolean {
  return status === 'successful' || status === 'partially_refunded';
}

export function campaignAcceptsContributions(status: string): boolean {
  return status === 'active';
}

export function contributionStatusLabel(status: string): string {
  return CONTRIBUTION_STATUS_LABELS[status as ContributionStatusValue] || status;
}

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method as PaymentMethodValue] || method;
}

export function campaignStatusLabel(status: string): string {
  return CAMPAIGN_STATUS_LABELS[status as CampaignStatusValue] || status;
}
