/** Exponential backoff for failed communication jobs (capped at 1 hour). */
export function communicationBackoffMs(attempt: number): number {
  return Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempt - 1));
}
