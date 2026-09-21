import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';
import { paginationSchema } from '@/lib/admin/validation';
import {
  PASTORAL_CASE_STATUSES,
  PASTORAL_FOLLOWUP_STATUSES,
  PASTORAL_NOTE_VISIBILITIES,
  PASTORAL_PRIORITIES,
  PASTORAL_VISIT_LOCATIONS,
  PASTORAL_VISIT_STATUSES,
} from './status';

export { formatZodErrors };

export const pastoralCaseCreateSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  categoryId: z.string().trim().max(80).nullable().optional(),
  title: z.string().trim().min(3, 'Title is required').max(180),
  summary: z.string().trim().max(4000).nullable().optional(),
  priority: z.enum(PASTORAL_PRIORITIES).optional().default('normal'),
  status: z.enum(PASTORAL_CASE_STATUSES).optional().default('open'),
  assignedToId: z.string().trim().max(80).nullable().optional(),
});

export const pastoralCaseUpdateSchema = z.object({
  categoryId: z.string().trim().max(80).nullable().optional(),
  title: z.string().trim().min(3).max(180).optional(),
  summary: z.string().trim().max(4000).nullable().optional(),
  priority: z.enum(PASTORAL_PRIORITIES).optional(),
  status: z.enum(PASTORAL_CASE_STATUSES).optional(),
  assignedToId: z.string().trim().max(80).nullable().optional(),
  reason: z.string().trim().max(400).nullable().optional(),
});

export const pastoralNoteCreateSchema = z.object({
  content: z.string().trim().min(3, 'Note is required').max(8000),
  visibility: z.enum(PASTORAL_NOTE_VISIBILITIES).optional().default('case_team'),
});

export const pastoralVisitCreateSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  caseId: z.string().trim().max(80).nullable().optional(),
  assignedToId: z.string().trim().max(80).nullable().optional(),
  scheduledAt: z.string().trim().min(1).max(40),
  status: z.enum(PASTORAL_VISIT_STATUSES).optional().default('scheduled'),
  locationType: z.enum(PASTORAL_VISIT_LOCATIONS).optional().default('church'),
  locationNote: z.string().trim().max(400).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const pastoralVisitUpdateSchema = z.object({
  assignedToId: z.string().trim().max(80).nullable().optional(),
  scheduledAt: z.string().trim().min(1).max(40).optional(),
  completedAt: z.string().trim().max(40).nullable().optional(),
  status: z.enum(PASTORAL_VISIT_STATUSES).optional(),
  locationType: z.enum(PASTORAL_VISIT_LOCATIONS).optional(),
  locationNote: z.string().trim().max(400).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const pastoralFollowUpCreateSchema = z.object({
  caseId: z.string().trim().max(80).nullable().optional(),
  memberId: z.string().trim().max(80).nullable().optional(),
  assignedToId: z.string().trim().max(80).nullable().optional(),
  task: z.string().trim().min(3, 'Task is required').max(500),
  dueDate: z.string().trim().max(40).nullable().optional(),
  status: z.enum(PASTORAL_FOLLOWUP_STATUSES).optional().default('pending'),
});

export const pastoralFollowUpUpdateSchema = z.object({
  assignedToId: z.string().trim().max(80).nullable().optional(),
  task: z.string().trim().min(3).max(500).optional(),
  dueDate: z.string().trim().max(40).nullable().optional(),
  status: z.enum(PASTORAL_FOLLOWUP_STATUSES).optional(),
  completedAt: z.string().trim().max(40).nullable().optional(),
});

export const pastoralCategoryWriteSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string().trim().max(400).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  isActive: z.boolean().optional(),
});

export const pastoralCaseListSchema = paginationSchema.extend({
  status: z.enum(PASTORAL_CASE_STATUSES).optional(),
  priority: z.enum(PASTORAL_PRIORITIES).optional(),
  categoryId: z.string().trim().max(80).optional(),
  memberId: z.string().trim().max(80).optional(),
  assignedTo: z.string().trim().max(80).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
});

export const pastoralVisitListSchema = paginationSchema.extend({
  status: z.enum(PASTORAL_VISIT_STATUSES).optional(),
  memberId: z.string().trim().max(80).optional(),
  caseId: z.string().trim().max(80).optional(),
  assignedTo: z.string().trim().max(80).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
});

export const pastoralFollowUpListSchema = paginationSchema.extend({
  status: z.enum(PASTORAL_FOLLOWUP_STATUSES).optional(),
  memberId: z.string().trim().max(80).optional(),
  caseId: z.string().trim().max(80).optional(),
  assignedTo: z.string().trim().max(80).optional(),
  due: z.enum(['overdue', 'upcoming']).optional(),
});

export const pastoralReportsQuerySchema = z.object({
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
});

export const PROFILE_CHANGE_PROTECTED_FIELDS = [
  'emergencyContactName',
  'emergencyContactPhone',
  'dateOfBirth',
  'addressNote',
  'baptismDate',
  'baptismNote',
] as const;

export const profileChangeRequestSchema = z
  .object({
    emergencyContactName: z.string().trim().max(120).nullable().optional(),
    emergencyContactPhone: z.string().trim().max(40).nullable().optional(),
    dateOfBirth: z.string().trim().max(40).nullable().optional(),
    addressNote: z.string().trim().max(400).nullable().optional(),
    baptismDate: z.string().trim().max(40).nullable().optional(),
    baptismNote: z.string().trim().max(400).nullable().optional(),
  })
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    { message: 'Provide at least one protected field to update.' }
  );

export const profileChangeReviewSchema = z.object({
  staffNote: z.string().trim().max(1000).nullable().optional(),
});

export const memberDocumentCreateSchema = z.object({
  title: z.string().trim().min(2).max(180),
  retentionUntil: z.string().trim().max(40).nullable().optional(),
});

export const profileChangeListSchema = paginationSchema.extend({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  memberId: z.string().trim().max(80).optional(),
});
