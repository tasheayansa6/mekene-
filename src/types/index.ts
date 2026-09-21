/**
 * Foundation type definitions for Busa Mekene Eyasus Church platform.
 * These types provide the base contracts for all future modules.
 */

// ============================================================
// API Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string | null;
  errors: Record<string, string[]> | null;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  status?: number;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  message: string;
  errors: Record<string, string[]> | null;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string | null;
  errors: null;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================
// User & Authentication Types (Phase 6)
// ============================================================

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'pastor'
  | 'church_leader'
  | 'ministry_leader'
  | 'media_team'
  | 'prayer_team'
  | 'finance'
  | 'member';

export type AccountStatus = 'pending' | 'active' | 'suspended' | 'deactivated';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  profileImage?: string | null;
  role: {
    id: string;
    slug: UserRole | string;
    name: string;
  };
  permissions?: Array<{ resource: string; action: string }>;
  status: AccountStatus | string;
  isVerified: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Module Types (Stubs for future phases)
// ============================================================

export interface Member {
  id: string;
  userId: string;
  membershipNumber?: string;
  status: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sermon {
  id: string;
  title: string;
  description?: string;
  speaker: string;
  date: string;
  audioUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  description?: string;
  startAt: string;
  endAt: string;
  timezone: string;
  location?: string;
  isOnline: boolean;
  status: string;
  createdAt: string;
}

export interface PrayerRequest {
  id: string;
  name: string;
  request: string;
  isAnonymous: boolean;
  isPrayedFor: boolean;
  createdAt: string;
}

export interface Ministry {
  id: string;
  name: string;
  description?: string;
  leaderName?: string;
  memberCount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Donation {
  id: string;
  memberId?: string;
  amount: number;
  currency: string;
  donationType: string;
  date: string;
  isAnonymous: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  endDate?: string;
  isPublished: boolean;
  createdAt: string;
}

export interface GalleryImage {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  albumId?: string;
  takenAt?: string;
  createdAt: string;
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  category: string;
  fileUrl?: string;
  externalUrl?: string;
  createdAt: string;
}

// ============================================================
// UI State Types
// ============================================================

export interface SelectOption {
  label: string;
  value: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
 field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: unknown;
}
