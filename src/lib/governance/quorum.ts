export type QuorumConfig = {
  quorumCount?: number | null;
  quorumPercent?: number | null;
};

export type QuorumSnapshot = {
  eligibleCount: number;
  presentCount: number;
  requiredCount: number | null;
  requiredPercent: number | null;
  quorumReached: boolean | null;
  autoValidateLegal: boolean;
};

/**
 * Configurable quorum — never hard-code a percentage.
 * Returns quorumReached=null when no rule is configured (do not invent legal validity).
 */
export function evaluateQuorum(
  config: QuorumConfig & { autoValidateLegal?: boolean },
  eligibleCount: number,
  presentCount: number
): QuorumSnapshot {
  const autoValidateLegal = Boolean(config.autoValidateLegal);
  let requiredCount: number | null = null;

  if (config.quorumCount != null && config.quorumCount > 0) {
    requiredCount = config.quorumCount;
  } else if (config.quorumPercent != null && config.quorumPercent > 0) {
    requiredCount = Math.ceil((eligibleCount * config.quorumPercent) / 100);
  }

  let quorumReached: boolean | null = null;
  if (requiredCount != null) {
    quorumReached = presentCount >= requiredCount;
  }

  return {
    eligibleCount,
    presentCount,
    requiredCount,
    requiredPercent: config.quorumPercent ?? null,
    quorumReached,
    autoValidateLegal,
  };
}

export function isPresentAttendance(status: string): boolean {
  return status === 'present' || status === 'late';
}
