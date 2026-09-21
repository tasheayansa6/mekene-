import { z } from 'zod';
import {
  APPLICATION_STATUSES,
  DIRECTORY_VISIBILITIES,
  MEMBER_MINISTRY_STATUSES,
  MEMBERSHIP_STATUSES,
} from './status';

const phoneLike = z
  .string()
  .trim()
  .max(40)
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? value : undefined));

export const membershipApplicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.').max(120),
  preferredContact: phoneLike,
  preferredLanguage: z.enum(['en', 'am']).default('en'),
  howHeard: z.string().trim().max(200).optional().or(z.literal('')),
  ministryInterests: z.string().trim().max(500).optional().or(z.literal('')),
  applicantNote: z.string().trim().max(500).optional().or(z.literal('')),
});

export const applicationUpdateSchema = membershipApplicationSchema.partial().extend({
  applicantNote: z.string().trim().max(500).optional().or(z.literal('')),
});

/**
 * Self-service profile patch — protected fields (emergency contact, DOB,
 * addressNote, baptism*) must go through MemberProfileChangeRequest, not here.
 */
export const memberSelfPatchSchema = z
  .object({
    displayName: z.string().trim().max(120).optional().or(z.literal('')),
    preferredLanguage: z.enum(['en', 'am']).optional(),
    directoryVisibility: z.enum(DIRECTORY_VISIBILITIES).optional(),
    showProfilePhoto: z.boolean().optional(),
    showDisplayName: z.boolean().optional(),
    showMinistry: z.boolean().optional(),
    showContactButton: z.boolean().optional(),
  })
  .strict();

export const MEMBER_PROTECTED_PROFILE_FIELDS = [
  'emergencyContactName',
  'emergencyContactPhone',
  'dateOfBirth',
  'addressNote',
  'baptismDate',
  'baptismNote',
] as const;

export const adminMemberPatchSchema = z.object({
  displayName: z.string().trim().max(120).nullable().optional(),
  preferredLanguage: z.enum(['en', 'am']).optional(),
  status: z.enum(MEMBERSHIP_STATUSES).optional(),
  householdId: z.string().min(1).nullable().optional(),
  directoryVisibility: z.enum(DIRECTORY_VISIBILITIES).optional(),
  showProfilePhoto: z.boolean().optional(),
  showDisplayName: z.boolean().optional(),
  showMinistry: z.boolean().optional(),
  reason: z.string().trim().max(400).optional(),
});

export const reviewActionSchema = z.object({
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional().or(z.literal('')),
  reason: z.string().trim().max(400).optional().or(z.literal('')),
});

export const householdSchema = z.object({
  name: z.string().trim().min(2, 'Household name is required.').max(120),
  primaryMemberId: z.string().min(1).nullable().optional(),
  addressNote: z.string().trim().max(240).optional().or(z.literal('')),
});

export const memberMinistrySchema = z.object({
  ministryId: z.string().min(1, 'Ministry is required.'),
  roleLabel: z.string().trim().max(80).optional().or(z.literal('')),
  status: z.enum(MEMBER_MINISTRY_STATUSES).optional(),
});

export const membersBulkSchema = z.object({
  action: z.enum(['archive', 'set_inactive', 'set_active']),
  ids: z.array(z.string().min(1)).min(1).max(100),
  reason: z.string().trim().max(400).optional(),
});

export const applicationListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  pending: z.enum(['1', 'true']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const memberListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(MEMBERSHIP_STATUSES).optional(),
  householdId: z.string().min(1).optional(),
  ministryId: z.string().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(['updatedAt', 'dateJoined', 'membershipNumber', 'status']).optional(),
  dir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
