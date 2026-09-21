/**
 * Score a quiz attempt. correctJson is server-only and never returned to learners.
 * Supported formats:
 * - multiple_choice / true_false / short_answer: JSON string of the correct value
 * - multiple_answer: JSON array of correct option ids/values
 */
export function scoreQuizAnswers(
  questions: Array<{
    id: string;
    questionType: string;
    correctJson: string;
    points: number;
  }>,
  answers: Record<string, unknown>
): { score: number; maxScore: number; passed: boolean; passingScore: number } {
  let score = 0;
  let maxScore = 0;

  for (const q of questions) {
    maxScore += q.points;
    const given = answers[q.id];
    if (given === undefined || given === null) continue;

    let correct: unknown;
    try {
      correct = JSON.parse(q.correctJson);
    } catch {
      correct = q.correctJson;
    }

    if (q.questionType === 'multiple_answer') {
      const expected = Array.isArray(correct) ? [...correct].map(String).sort() : [];
      const actual = Array.isArray(given) ? [...given].map(String).sort() : [];
      if (
        expected.length === actual.length &&
        expected.every((value, index) => value === actual[index])
      ) {
        score += q.points;
      }
      continue;
    }

    if (String(given).trim().toLowerCase() === String(correct).trim().toLowerCase()) {
      score += q.points;
    }
  }

  return { score, maxScore, passed: false, passingScore: 0 };
}

export function evaluateQuizAttempt(
  questions: Array<{
    id: string;
    questionType: string;
    correctJson: string;
    points: number;
  }>,
  answers: Record<string, unknown>,
  passingScore: number
) {
  const result = scoreQuizAnswers(questions, answers);
  const pct = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  return {
    score: result.score,
    maxScore: result.maxScore,
    percent: pct,
    passed: pct >= passingScore,
  };
}
