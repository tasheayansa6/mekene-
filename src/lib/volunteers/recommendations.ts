import type { EligibilityMatch, EligibilityReason } from './eligibility';

export function recommendationExplanation(input: {
  matches: EligibilityMatch[];
  reasons: EligibilityReason[];
}): string[] {
  const lines: string[] = [];
  if (input.matches.includes('skill_match')) lines.push('Skill match');
  if (input.matches.includes('available')) lines.push('Available');
  if (input.matches.includes('trained')) lines.push('Trained');
  if (input.matches.includes('no_conflict')) lines.push('No conflict');
  if (input.matches.includes('team_member')) lines.push('Team member');
  return lines;
}

export function recommendationScore(input: {
  ok: boolean;
  matches: EligibilityMatch[];
  reasons: EligibilityReason[];
}): number {
  if (!input.ok) return 0;
  return input.matches.length * 10;
}
