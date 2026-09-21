import { z } from 'zod';
import {
  CHECK_IN_METHODS,
  RECORD_STATUSES,
  SESSION_STATUSES,
  SESSION_TYPES,
} from './status';

export const sessionCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  sessionType: z.enum(SESSION_TYPES).default('sunday_service'),
  status: z.enum(SESSION_STATUSES).optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().optional().nullable(),
  timezone: z.string().trim().min(1).max(80).optional(),
  locationNote: z.string().trim().max(240).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  eventId: z.string().min(1).optional().nullable(),
  ministryId: z.string().min(1).optional().nullable(),
  locationId: z.string().min(1).optional().nullable(),
  seriesId: z.string().min(1).optional().nullable(),
  allowSelfCheckIn: z.boolean().optional(),
  allowQrCheckIn: z.boolean().optional(),
});

export const sessionPatchSchema = sessionCreateSchema.partial().extend({
  status: z.enum(SESSION_STATUSES).optional(),
});

export const recordCreateSchema = z.object({
  sessionId: z.string().min(1),
  memberId: z.string().min(1),
  status: z.enum(RECORD_STATUSES).optional(),
  method: z.enum(CHECK_IN_METHODS).optional(),
  checkInAt: z.string().optional().nullable(),
  checkOutAt: z.string().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const recordPatchSchema = z.object({
  status: z.enum(RECORD_STATUSES).optional(),
  method: z.enum(CHECK_IN_METHODS).optional(),
  checkInAt: z.string().optional().nullable(),
  checkOutAt: z.string().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  reason: z.string().trim().min(3).max(400),
});

export const selfCheckInSchema = z.object({
  sessionId: z.string().min(1),
});

export const qrCheckInSchema = z.object({
  token: z.string().trim().min(16).max(128),
});

export const qrGenerateSchema = z.object({
  ttlMinutes: z.coerce.number().int().min(5).max(240).optional().default(60),
});

export const sessionListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(SESSION_STATUSES).optional(),
  sessionType: z.enum(SESSION_TYPES).optional(),
  ministryId: z.string().min(1).optional(),
  eventId: z.string().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const recordListQuerySchema = z.object({
  sessionId: z.string().min(1).optional(),
  memberId: z.string().min(1).optional(),
  status: z.enum(RECORD_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const reportsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  sessionType: z.enum(SESSION_TYPES).optional(),
  ministryId: z.string().min(1).optional(),
  groupBy: z.enum(['day', 'week', 'month', 'sessionType', 'ministry']).optional().default('day'),
});
