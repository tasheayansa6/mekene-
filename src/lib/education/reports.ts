import { db } from '@/lib/db';

/** Simple education summary counts for admin dashboard. */
export async function getEducationReportSummary() {
  const [programs, courses, enrollments, certificatesIssued, enrollmentsByStatus] =
    await Promise.all([
      db.educationProgram.count(),
      db.educationCourse.count(),
      db.educationEnrollment.count(),
      db.educationCertificate.count({ where: { status: 'issued' } }),
      db.educationEnrollment.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

  return {
    programs,
    courses,
    enrollments,
    certificatesIssued,
    enrollmentsByStatus: enrollmentsByStatus.map((row) => ({
      status: row.status,
      count: row._count._all,
    })),
  };
}
