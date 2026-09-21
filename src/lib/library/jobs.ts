import { db } from '@/lib/db';
import type { MediaJobStatus } from '@prisma/client';

const STUB_JOB_TYPES = new Set(['metadata_probe', 'thumbnail_stub']);

export function buildJobIdempotencyKey(input: {
  type: string;
  targetKind: string;
  targetId?: string | null;
}): string {
  return `${input.type}:${input.targetKind}:${input.targetId || 'none'}`;
}

export async function enqueueMediaJob(input: {
  type: string;
  targetKind: string;
  targetId?: string | null;
  createdById?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey?: string | null;
}) {
  const idempotencyKey =
    input.idempotencyKey?.trim() ||
    buildJobIdempotencyKey({
      type: input.type,
      targetKind: input.targetKind,
      targetId: input.targetId,
    });

  const existing = await db.mediaProcessingJob.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return { job: existing, created: false };
  }

  const job = await db.mediaProcessingJob.create({
    data: {
      type: input.type,
      targetKind: input.targetKind,
      targetId: input.targetId || null,
      payload: input.payload ? JSON.stringify(input.payload) : null,
      createdById: input.createdById || null,
      idempotencyKey,
      status: 'pending',
    },
  });

  return { job, created: true };
}

function parsePayload(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function completeJob(
  jobId: string,
  note?: string,
  extra?: { payload?: Record<string, unknown> }
) {
  const payload = extra?.payload ? JSON.stringify(extra.payload) : undefined;
  return db.mediaProcessingJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      processedAt: new Date(),
      lastError: note || null,
      ...(payload ? { payload } : {}),
    },
  });
}

async function failJob(jobId: string, message: string, attemptCount: number, maxAttempts: number) {
  const status: MediaJobStatus = attemptCount >= maxAttempts ? 'failed' : 'pending';
  return db.mediaProcessingJob.update({
    where: { id: jobId },
    data: {
      status,
      attemptCount,
      lastError: message,
      processedAt: status === 'failed' ? new Date() : null,
    },
  });
}

async function processOneJob(job: {
  id: string;
  type: string;
  targetKind: string;
  targetId: string | null;
  payload: string | null;
  attemptCount: number;
  maxAttempts: number;
}) {
  await db.mediaProcessingJob.update({
    where: { id: job.id },
    data: { status: 'processing', attemptCount: { increment: 1 } },
  });

  const attemptCount = job.attemptCount + 1;
  const payload = parsePayload(job.payload);

  try {
    if (job.type === 'metadata_probe') {
      const durationSeconds =
        typeof payload.durationSeconds === 'number'
          ? payload.durationSeconds
          : typeof payload.duration === 'number'
            ? payload.duration
            : null;

      if (
        job.targetKind === 'sermon' &&
        job.targetId &&
        durationSeconds != null &&
        Number.isFinite(durationSeconds)
      ) {
        await db.sermon.update({
          where: { id: job.targetId },
          data: { durationSeconds: Math.round(durationSeconds) },
        });
      }

      return completeJob(job.id, 'metadata_probe completed', {
        payload: { ...payload, note: 'metadata_probe completed' },
      });
    }

    if (job.type === 'thumbnail_stub') {
      return completeJob(job.id, 'thumbnail_stub completed (no-op worker)', {
        payload: { ...payload, note: 'thumbnail_stub completed' },
      });
    }

    if (STUB_JOB_TYPES.has(job.type)) {
      return completeJob(job.id, `${job.type} stub completed`);
    }

    return failJob(
      job.id,
      `Unknown job type "${job.type}" — not marked ready without a worker.`,
      attemptCount,
      job.maxAttempts
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Job processing failed';
    return failJob(job.id, message, attemptCount, job.maxAttempts);
  }
}

export async function processMediaJobs(limit = 10) {
  const jobs = await db.mediaProcessingJob.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  const results = [];
  for (const job of jobs) {
    results.push(await processOneJob(job));
  }

  return {
    processed: results.length,
    jobs: results.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      lastError: row.lastError,
    })),
  };
}

export async function listMediaJobs(options: {
  status?: MediaJobStatus;
  page?: number;
  pageSize?: number;
}) {
  const page = options.page || 1;
  const pageSize = Math.min(50, options.pageSize || 20);
  const where = options.status ? { status: options.status } : {};

  const [totalItems, rows] = await Promise.all([
    db.mediaProcessingJob.count({ where }),
    db.mediaProcessingJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    page,
    pageSize,
    totalItems,
    jobs: rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      targetKind: row.targetKind,
      targetId: row.targetId,
      attemptCount: row.attemptCount,
      maxAttempts: row.maxAttempts,
      idempotencyKey: row.idempotencyKey,
      lastError: row.lastError,
      processedAt: row.processedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
