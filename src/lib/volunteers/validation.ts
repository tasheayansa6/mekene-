import { z } from 'zod';
import { formatZodErrors } from '@/lib/auth/validation';
import { paginationSchema } from '@/lib/admin/validation';
import {
  ATTENDANCE_STATUSES,
  ONBOARDING_STATUSES,
  SERVICE_ASSIGNMENT_STATUSES,
  SKILL_PROFICIENCIES,
  STAFF_STATUSES,
  SUBSTITUTION_STATUSES,
  TRAINING_ENROLLMENT_STATUSES,
  VOLUNTEER_APPLICATION_STATUSES,
  VOLUNTEER_REQUEST_STATUSES,
  VOLUNTEER_REQUEST_TYPES,
  VOLUNTEER_STATUSES,
} from './status';

export { formatZodErrors };

export const staffListSchema = paginationSchema.extend({
  status: z.enum(STAFF_STATUSES).optional(),
  departmentId: z.string().trim().max(80).optional(),
  positionId: z.string().trim().max(80).optional(),
});

export const staffCreateSchema = z.object({
  userId: z.string().trim().min(1).max(80),
  memberId: z.string().trim().max(80).nullable().optional(),
  departmentId: z.string().trim().max(80).nullable().optional(),
  positionId: z.string().trim().max(80).nullable().optional(),
  supervisorId: z.string().trim().max(80).nullable().optional(),
  status: z.enum(STAFF_STATUSES).optional().default('active'),
  startDate: z.string().trim().max(40).nullable().optional(),
  workEmail: z.string().trim().email().max(180).nullable().optional().or(z.literal('')),
  workPhone: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  staffNumber: z.string().trim().max(40).nullable().optional(),
});

export const staffUpdateSchema = z.object({
  memberId: z.string().trim().max(80).nullable().optional(),
  departmentId: z.string().trim().max(80).nullable().optional(),
  positionId: z.string().trim().max(80).nullable().optional(),
  supervisorId: z.string().trim().max(80).nullable().optional(),
  status: z.enum(STAFF_STATUSES).optional(),
  statusReason: z.string().trim().max(400).nullable().optional(),
  startDate: z.string().trim().max(40).nullable().optional(),
  workEmail: z.string().trim().email().max(180).nullable().optional().or(z.literal('')),
  workPhone: z.string().trim().max(40).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  staffNumber: z.string().trim().max(40).nullable().optional(),
});

export const departmentWriteSchema = z.object({
  name: z.string().trim().min(1).max(120),
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

export const positionWriteSchema = departmentWriteSchema;

export const volunteerListSchema = paginationSchema.extend({
  status: z.enum(VOLUNTEER_STATUSES).optional(),
});

export const applicationListSchema = paginationSchema.extend({
  status: z.enum(VOLUNTEER_APPLICATION_STATUSES).optional(),
  ministryId: z.string().trim().max(80).optional(),
  memberId: z.string().trim().max(80).optional(),
});

export const applicationReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_info', 'under_review']),
  reviewNotes: z.string().trim().max(2000).nullable().optional(),
  reviewerMessage: z.string().trim().max(1000).nullable().optional(),
  addToMinistry: z.boolean().optional(),
});

export const memberApplicationCreateSchema = z.object({
  ministryId: z.string().trim().max(80).nullable().optional(),
  preferredMinistry: z.string().trim().max(120).nullable().optional(),
  skills: z.string().trim().max(1000).nullable().optional(),
  experience: z.string().trim().max(2000).nullable().optional(),
  availability: z.string().trim().max(1000).nullable().optional(),
  motivation: z.string().trim().max(2000).nullable().optional(),
  preferredTimes: z.string().trim().max(500).nullable().optional(),
  submit: z.boolean().optional().default(true),
});

export const teamListSchema = paginationSchema.extend({
  ministryId: z.string().trim().max(80).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const teamCreateSchema = z.object({
  ministryId: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  leaderUserId: z.string().trim().max(80).nullable().optional(),
  assistantLeaderUserId: z.string().trim().max(80).nullable().optional(),
  departmentId: z.string().trim().max(80).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const teamUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  leaderUserId: z.string().trim().max(80).nullable().optional(),
  assistantLeaderUserId: z.string().trim().max(80).nullable().optional(),
  departmentId: z.string().trim().max(80).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const teamMemberCreateSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  roleLabel: z.string().trim().max(80).nullable().optional(),
  status: z.string().trim().max(40).optional().default('active'),
  startDate: z.string().trim().max(40).nullable().optional(),
});

export const assignmentListSchema = paginationSchema.extend({
  ministryId: z.string().trim().max(80).optional(),
  memberId: z.string().trim().max(80).optional(),
  eventId: z.string().trim().max(80).optional(),
  teamId: z.string().trim().max(80).optional(),
  status: z.enum(SERVICE_ASSIGNMENT_STATUSES).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
});

export const assignmentCreateSchema = z.object({
  eventId: z.string().trim().min(1).max(80),
  memberId: z.string().trim().min(1).max(80),
  ministryId: z.string().trim().max(80).nullable().optional(),
  teamId: z.string().trim().max(80).nullable().optional(),
  roleId: z.string().trim().max(80).nullable().optional(),
  roleName: z.string().trim().min(1).max(120),
  scheduledAt: z.string().trim().min(1).max(40),
  endsAt: z.string().trim().max(40).nullable().optional(),
  status: z.enum(SERVICE_ASSIGNMENT_STATUSES).optional().default('proposed'),
  /** When true, create even if calendar conflicts exist (still returns warning). */
  allowConflicts: z.boolean().optional().default(false),
});

export const assignmentUpdateSchema = z.object({
  roleName: z.string().trim().min(1).max(120).optional(),
  scheduledAt: z.string().trim().max(40).optional(),
  endsAt: z.string().trim().max(40).nullable().optional(),
  status: z.enum(SERVICE_ASSIGNMENT_STATUSES).optional(),
  declineReason: z.string().trim().max(500).nullable().optional(),
  ministryId: z.string().trim().max(80).nullable().optional(),
  teamId: z.string().trim().max(80).nullable().optional(),
  roleId: z.string().trim().max(80).nullable().optional(),
  allowConflicts: z.boolean().optional().default(false),
});

export const assignmentDeclineSchema = z.object({
  declineReason: z.string().trim().max(500).nullable().optional(),
});

export const trainingProgramCreateSchema = z.object({
  ministryId: z.string().trim().max(80).nullable().optional(),
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  expiresAfterDays: z.coerce.number().int().min(1).max(3650).nullable().optional(),
});

export const trainingSessionCreateSchema = z.object({
  programId: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  startsAt: z.string().trim().min(1).max(40),
  endsAt: z.string().trim().max(40).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  capacity: z.coerce.number().int().min(1).max(10_000).nullable().optional(),
  instructorId: z.string().trim().max(80).nullable().optional(),
  status: z.string().trim().max(40).optional().default('scheduled'),
});

export const trainingEnrollSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
});

export const availabilitySlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  endTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  isAvailable: z.boolean().optional().default(true),
});

export const availabilityPutSchema = z.object({
  slots: z.array(availabilitySlotSchema).max(48),
});

export const reportsQuerySchema = z.object({
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  ministryId: z.string().trim().max(80).optional(),
});

export const rosterQuerySchema = paginationSchema.extend({
  ministryId: z.string().trim().max(80).optional(),
  teamId: z.string().trim().max(80).optional(),
  eventId: z.string().trim().max(80).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
});

export const skillProficiencySchema = z.enum(SKILL_PROFICIENCIES);
export const enrollmentStatusSchema = z.enum(TRAINING_ENROLLMENT_STATUSES);

export const exceptionCreateSchema = z.object({
  startAt: z.string().trim().min(1).max(40),
  endAt: z.string().trim().min(1).max(40),
  reason: z.string().trim().max(80).nullable().optional(),
  isAvailable: z.boolean().optional().default(false),
});

export const volunteerRequestCreateSchema = z.object({
  type: z.enum(VOLUNTEER_REQUEST_TYPES),
  ministryId: z.string().trim().max(80).nullable().optional(),
  teamId: z.string().trim().max(80).nullable().optional(),
  assignmentId: z.string().trim().max(80).nullable().optional(),
  note: z.string().trim().max(200).nullable().optional(),
  leaveStartAt: z.string().trim().max(40).nullable().optional(),
  leaveEndAt: z.string().trim().max(40).nullable().optional(),
});

export const volunteerRequestReviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(200).nullable().optional(),
});

export const substitutionCreateSchema = z.object({
  reason: z.string().trim().max(80).nullable().optional(),
});

export const substitutionApproveSchema = z.object({
  substituteMemberId: z.string().trim().min(1).max(80),
});

export const checkInSchema = z.object({
  token: z.string().trim().max(128).optional(),
  attendanceStatus: z.enum(ATTENDANCE_STATUSES).optional(),
});

export const hourCorrectionSchema = z.object({
  hoursMinutes: z.coerce.number().int().min(0).max(24 * 60),
  reason: z.string().trim().max(200).nullable().optional(),
  attendanceStatus: z.enum(ATTENDANCE_STATUSES).optional(),
});

export const volunteerRoleSchema = z.object({
  ministryId: z.string().trim().max(80).nullable().optional(),
  teamId: z.string().trim().max(80).nullable().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  requiredSkillId: z.string().trim().max(80).nullable().optional(),
  requiredProgramId: z.string().trim().max(80).nullable().optional(),
  slotsRequired: z.coerce.number().int().min(1).max(99).optional().default(1),
  requireTeamMembership: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const ministryRequirementSchema = z.object({
  ministryId: z.string().trim().min(1).max(80),
  teamId: z.string().trim().max(80).nullable().optional(),
  roleId: z.string().trim().max(80).nullable().optional(),
  skillId: z.string().trim().max(80).nullable().optional(),
  programId: z.string().trim().max(80).nullable().optional(),
  minAgeYears: z.coerce.number().int().min(0).max(120).nullable().optional(),
  requireTeamMembership: z.boolean().optional().default(false),
  blockIfExpired: z.boolean().optional().default(true),
  isMandatory: z.boolean().optional().default(true),
});

export const departmentWriteSchemaVolunteer = z.object({
  ministryId: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().trim().max(400).nullable().optional(),
});

export const onboardingTemplateSchema = z.object({
  ministryId: z.string().trim().max(80).nullable().optional(),
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        isRequired: z.boolean().optional().default(true),
        programId: z.string().trim().max(80).nullable().optional(),
      })
    )
    .max(20)
    .optional(),
});

export const skillCatalogSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  isActive: z.boolean().optional().default(true),
});

export const qualificationCreateSchema = z.object({
  memberId: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  issuer: z.string().trim().max(160).nullable().optional(),
  earnedAt: z.string().trim().max(40).nullable().optional(),
  expiresAt: z.string().trim().max(40).nullable().optional(),
  programId: z.string().trim().max(80).nullable().optional(),
});

export const teamAnnouncementSchema = z.object({
  teamId: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(1000),
});

export const coverageQuerySchema = z.object({
  eventId: z.string().trim().min(1).max(80),
  ministryId: z.string().trim().max(80).optional(),
  teamId: z.string().trim().max(80).optional(),
});

export const recommendQuerySchema = z.object({
  eventId: z.string().trim().min(1).max(80),
  roleId: z.string().trim().max(80).optional(),
  roleName: z.string().trim().max(120).optional(),
  ministryId: z.string().trim().max(80).optional(),
  teamId: z.string().trim().max(80).optional(),
  scheduledAt: z.string().trim().max(40).optional(),
  endsAt: z.string().trim().max(40).optional(),
});

export const volunteerSkillPutSchema = z.object({
  skills: z
    .array(
      z.object({
        skillId: z.string().trim().min(1).max(80),
        proficiency: z.enum(SKILL_PROFICIENCIES),
      })
    )
    .max(40),
});

export const profilePreferencesSchema = z.object({
  maxFrequencyPerMonth: z.coerce.number().int().min(1).max(31).nullable().optional(),
  preferredServiceTypes: z.string().trim().max(400).nullable().optional(),
});

export const onboardingItemCompleteSchema = z.object({
  itemId: z.string().trim().min(1).max(80),
  status: z.enum(ONBOARDING_STATUSES).optional(),
});

export const substitutionStatusSchema = z.enum(SUBSTITUTION_STATUSES);
export const requestStatusSchema = z.enum(VOLUNTEER_REQUEST_STATUSES);
