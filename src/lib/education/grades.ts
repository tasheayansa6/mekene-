/** Weighted final score from component percentages (0–100). */
export function computeFinalScore(input: {
  assignmentScore: number | null;
  quizScore: number | null;
  examScore: number | null;
  attendanceScore: number | null;
  assignmentWeight: number;
  quizWeight: number;
  examWeight: number;
  attendanceWeight: number;
}): number | null {
  const parts: Array<{ score: number; weight: number }> = [];
  if (input.assignmentScore != null) {
    parts.push({ score: input.assignmentScore, weight: input.assignmentWeight });
  }
  if (input.quizScore != null) {
    parts.push({ score: input.quizScore, weight: input.quizWeight });
  }
  if (input.examScore != null) {
    parts.push({ score: input.examScore, weight: input.examWeight });
  }
  if (input.attendanceScore != null) {
    parts.push({ score: input.attendanceScore, weight: input.attendanceWeight });
  }
  if (!parts.length) return null;
  const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
  if (totalWeight <= 0) return null;
  const weighted = parts.reduce((sum, part) => sum + part.score * part.weight, 0);
  return Math.round(weighted / totalWeight);
}

export function letterFromScore(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function gradeStatusFromScore(
  score: number | null,
  passingScore: number
): 'in_progress' | 'passed' | 'failed' {
  if (score == null) return 'in_progress';
  return score >= passingScore ? 'passed' : 'failed';
}
