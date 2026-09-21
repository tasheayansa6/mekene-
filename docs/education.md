# Phase 31 — Church Education & Bible School

Structured Bible school / discipleship education. Distinct from volunteer **TrainingProgram** (Phase 22 volunteering onboarding), which covers operational team training — not academic coursework, grades, or certificates.

## Architecture

```
EducationProgram
  └── EducationCourse
        ├── CourseModule → CourseLesson → LessonProgress
        ├── EducationEnrollment / EducationWaitlist
        ├── EducationAssignment → AssignmentSubmission
        ├── EducationQuiz → QuizQuestion / QuizAttempt
        ├── EducationExam → ExamAttempt
        ├── EducationClassSession → EducationAttendance
        ├── EducationGrade
        └── EducationCertificate
```

RBAC resource: `education` (`view`, `create`, `update`, `delete`, `publish`, `approve`, `assign`, `manage`, `export`).

## Privacy

- Quiz `correctJson` is **server-only**. Learner serializers (`serializeQuizForLearner`) never include answer keys.
- Assignment `privateNote` is instructor/admin only — member submission APIs expose `feedback` and `score`, never `privateNote`.
- Certificate public verify returns name/course/number/status only (no internal ids beyond verification code).

## Lib modules

| File | Role |
|------|------|
| `access.ts` | RBAC helpers, active enrollment statuses, `canInstructCourse` |
| `serialize.ts` | API DTOs (quiz without keys) |
| `enrollment.ts` | Apply / status / active enrollment gate |
| `progress.ts` | Lesson complete + `progressPct` |
| `programs.ts` / `courses.ts` | CRUD + published lists |
| `quiz.ts` / `grades.ts` | Scoring helpers |
| `certificates.ts` | Issue + verify by code |
| `reports.ts` | Admin summary counts |

## APIs

### Public
- `GET /api/v1/education/programs` — published programs
- `GET /api/v1/education/courses` — published courses
- `GET /api/v1/education/courses/[slug]` — course + published lessons
- `GET /api/v1/public/certificates/[code]` — verify certificate

### Member
- `GET /api/v1/member/education/courses` — my enrollments + available
- `GET /api/v1/member/education/courses/[id]`
- `POST /api/v1/member/education/courses/[id]/enroll`
- `POST /api/v1/member/education/lessons/[id]/complete`
- `GET /api/v1/member/education/assignments`
- `POST /api/v1/member/education/assignments/[id]/submit`
- `GET /api/v1/member/education/quizzes/[id]` — no correct answers
- `POST /api/v1/member/education/quizzes/[id]/attempt` — server-side score
- `GET /api/v1/member/education/grades`
- `GET /api/v1/member/education/certificates`

### Admin
- `GET|POST /api/v1/admin/education/programs`
- `GET|POST /api/v1/admin/education/courses`
- `GET|PATCH /api/v1/admin/education/enrollments` (body: `id`, `status`)
- `GET /api/v1/admin/education/reports`

### Instructor
- `GET /api/v1/instructor/courses` — instructor or education update/manage
- `GET /api/v1/instructor/courses/[id]/students`
- `GET|POST /api/v1/instructor/courses/[id]/attendance`
- `PATCH /api/v1/instructor/submissions/[id]/grade`

## Routes (pages)

| Path | Audience |
|------|----------|
| `/education` | Public hub |
| `/education/programs`, `/education/programs/[slug]` | Public |
| `/education/courses`, `/education/courses/[slug]` | Public |
| `/verify/certificate/[code]` | Public verify |
| `/member/education/*` | Member portal |
| `/admin/education`, `/admin/education/reports` | Admin |
| `/instructor/courses` | Instructors |

## Distinction from volunteer training

| | Church Education | Volunteer TrainingProgram |
|--|------------------|---------------------------|
| Purpose | Bible school, grades, certificates | Ministry/team readiness |
| Models | `Education*` | `TrainingProgram` / sessions |
| Nav | `/education`, `/member/education` | `/member/volunteering` |

## Tests

```bash
npm run test:education
```
