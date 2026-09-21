import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateQuizAttempt, scoreQuizAnswers } from './quiz';
import { computeFinalScore, gradeStatusFromScore, letterFromScore } from './grades';
import { serializeQuizForLearner } from './serialize';
import {
  canInstructCourse,
  canManageEducation,
  canViewEducation,
  isActiveEnrollmentStatus,
} from './access';
import type { AuthUser } from '@/lib/auth/permissions';

function mockUser(perms: Array<{ resource: string; action: string }>): AuthUser {
  return {
    id: 'user-1',
    email: 't@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    profileImage: null,
    status: 'active',
    isVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: 'role-1',
      name: 'Staff',
      slug: 'staff',
    },
    permissions: perms.map((p) => ({
      id: `${p.resource}:${p.action}`,
      resource: p.resource,
      action: p.action,
    })),
  } as AuthUser;
}

describe('quiz scoring', () => {
  const questions = [
    {
      id: 'q1',
      questionType: 'multiple_choice',
      correctJson: '"a"',
      points: 2,
    },
    {
      id: 'q2',
      questionType: 'true_false',
      correctJson: '"true"',
      points: 1,
    },
    {
      id: 'q3',
      questionType: 'multiple_answer',
      correctJson: '["x","y"]',
      points: 3,
    },
  ];

  it('scores correct answers', () => {
    const result = evaluateQuizAttempt(
      questions,
      { q1: 'a', q2: 'true', q3: ['y', 'x'] },
      60
    );
    assert.equal(result.score, 6);
    assert.equal(result.maxScore, 6);
    assert.equal(result.percent, 100);
    assert.equal(result.passed, true);
  });

  it('is case-insensitive for short answers', () => {
    const result = scoreQuizAnswers(
      [{ id: 'q', questionType: 'short_answer', correctJson: '"Grace"', points: 1 }],
      { q: ' grace ' }
    );
    assert.equal(result.score, 1);
  });

  it('fails below passing score', () => {
    const result = evaluateQuizAttempt(questions, { q1: 'wrong' }, 80);
    assert.equal(result.passed, false);
    assert.equal(result.percent, 0);
  });
});

describe('grades', () => {
  it('computes weighted final score', () => {
    const score = computeFinalScore({
      assignmentScore: 80,
      quizScore: 90,
      examScore: 70,
      attendanceScore: 100,
      assignmentWeight: 20,
      quizWeight: 20,
      examWeight: 40,
      attendanceWeight: 20,
    });
    assert.equal(score, 82);
  });

  it('returns null when no components', () => {
    assert.equal(
      computeFinalScore({
        assignmentScore: null,
        quizScore: null,
        examScore: null,
        attendanceScore: null,
        assignmentWeight: 20,
        quizWeight: 20,
        examWeight: 40,
        attendanceWeight: 20,
      }),
      null
    );
  });

  it('maps letter grades and status', () => {
    assert.equal(letterFromScore(95), 'A');
    assert.equal(letterFromScore(55), 'F');
    assert.equal(gradeStatusFromScore(70, 60), 'passed');
    assert.equal(gradeStatusFromScore(50, 60), 'failed');
    assert.equal(gradeStatusFromScore(null, 60), 'in_progress');
  });
});

describe('serialize quiz privacy', () => {
  it('never includes correctJson for learners', () => {
    const serialized = serializeQuizForLearner({
      id: 'quiz-1',
      courseId: 'c1',
      title: 'Quiz',
      instructions: null,
      timeLimitMin: null,
      maxAttempts: 1,
      passingScore: 60,
      status: 'published',
      questions: [
        {
          id: 'q1',
          prompt: 'Who?',
          questionType: 'multiple_choice',
          optionsJson: '["a","b"]',
          points: 1,
          sortOrder: 0,
          // @ts-expect-error intentional leak attempt
          correctJson: '"a"',
        },
      ],
    });
    const json = JSON.stringify(serialized);
    assert.equal(json.includes('correctJson'), false);
    assert.equal(
      Object.keys(serialized.questions?.[0] || {}).includes('correctJson'),
      false
    );
    assert.deepEqual(serialized.questions?.[0]?.options, ['a', 'b']);
  });
});

describe('education access helpers', () => {
  it('checks view and manage permissions', () => {
    const viewer = mockUser([{ resource: 'education', action: 'view' }]);
    const manager = mockUser([{ resource: 'education', action: 'manage' }]);
    const none = mockUser([]);
    assert.equal(canViewEducation(viewer), true);
    assert.equal(canManageEducation(viewer), false);
    assert.equal(canManageEducation(manager), true);
    assert.equal(canViewEducation(none), false);
  });

  it('allows course instructor or update permission', () => {
    const instructor = mockUser([]);
    instructor.id = 'inst-1';
    assert.equal(canInstructCourse(instructor, 'inst-1'), true);
    assert.equal(canInstructCourse(instructor, 'other'), false);
    const staff = mockUser([{ resource: 'education', action: 'update' }]);
    assert.equal(canInstructCourse(staff, 'other'), true);
  });

  it('recognizes active enrollment statuses', () => {
    assert.equal(isActiveEnrollmentStatus('enrolled'), true);
    assert.equal(isActiveEnrollmentStatus('application'), false);
    assert.equal(isActiveEnrollmentStatus('rejected'), false);
  });
});
