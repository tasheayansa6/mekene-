import { db } from '@/lib/db';
import type { MediaReportStatus } from '@prisma/client';

export async function createMediaReport(input: {
  sermonId: string;
  reason: string;
  details?: string | null;
  reporterId?: string | null;
}) {
  return db.mediaContentReport.create({
    data: {
      sermonId: input.sermonId,
      reason: input.reason.trim(),
      details: input.details?.trim() || null,
      reporterId: input.reporterId || null,
      status: 'open',
    },
  });
}

export async function listOpenReports(options?: { page?: number; pageSize?: number }) {
  const page = options?.page || 1;
  const pageSize = Math.min(50, options?.pageSize || 20);
  const where = { status: 'open' as const };

  const [totalItems, rows] = await Promise.all([
    db.mediaContentReport.count({ where }),
    db.mediaContentReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        sermon: { select: { id: true, title: true, slug: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  return {
    page,
    pageSize,
    totalItems,
    reports: rows.map((row) => ({
      id: row.id,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      sermon: row.sermon,
      reporter: row.reporter
        ? {
            id: row.reporter.id,
            name: `${row.reporter.firstName} ${row.reporter.lastName}`.trim(),
          }
        : null,
    })),
  };
}

export async function reviewReport(input: {
  reportId: string;
  status: MediaReportStatus;
  reviewedById: string;
}) {
  return db.mediaContentReport.update({
    where: { id: input.reportId },
    data: {
      status: input.status,
      reviewedById: input.reviewedById,
      reviewedAt: new Date(),
    },
  });
}

export async function attachSubtitle(input: {
  sermonId: string;
  language: string;
  format: string;
  fileUrl: string;
  label?: string | null;
  isDefault?: boolean;
  uploadedById?: string | null;
}) {
  return db.mediaSubtitle.upsert({
    where: {
      sermonId_language_format: {
        sermonId: input.sermonId,
        language: input.language,
        format: input.format,
      },
    },
    update: {
      fileUrl: input.fileUrl,
      label: input.label || null,
      isDefault: input.isDefault ?? false,
      uploadedById: input.uploadedById || null,
    },
    create: {
      sermonId: input.sermonId,
      language: input.language,
      format: input.format,
      fileUrl: input.fileUrl,
      label: input.label || null,
      isDefault: input.isDefault ?? false,
      uploadedById: input.uploadedById || null,
    },
  });
}
