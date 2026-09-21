import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { serializeCertificate, serializeCertificatePublic } from './serialize';

function certificateNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `BME-EDU-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function verificationCode() {
  return randomBytes(8).toString('hex');
}

export async function issueCertificate(input: {
  courseId: string;
  memberId: string;
  issuedById?: string | null;
}) {
  const course = await db.educationCourse.findUnique({
    where: { id: input.courseId },
    include: {
      program: { select: { name: true } },
    },
  });
  if (!course) throw new Error('Course not found');

  const member = await db.member.findUnique({
    where: { id: input.memberId },
    select: {
      id: true,
      displayName: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!member) throw new Error('Member not found');

  const studentName =
    member.displayName ||
    `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim() ||
    'Student';

  const existing = await db.educationCertificate.findFirst({
    where: { courseId: input.courseId, memberId: input.memberId, status: 'issued' },
  });
  if (existing) return serializeCertificate(existing);

  const row = await db.educationCertificate.create({
    data: {
      courseId: input.courseId,
      memberId: input.memberId,
      programName: course.program?.name ?? null,
      courseTitle: course.title,
      studentName,
      certificateNumber: certificateNumber(),
      verificationCode: verificationCode(),
      issuedById: input.issuedById ?? null,
      status: 'issued',
    },
  });

  return serializeCertificate(row);
}

export async function verifyCertificateByCode(code: string) {
  const row = await db.educationCertificate.findUnique({
    where: { verificationCode: code.trim() },
  });
  if (!row) return null;
  return serializeCertificatePublic(row);
}
