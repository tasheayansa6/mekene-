/**
 * Church Profile API types, fetcher, and helper functions.
 * Used to consume the GET /api/v1/church/profile endpoint.
 */

import type { ApiResponse } from '@/types';

// ============================================================
// Types
// ============================================================

export interface ChurchServiceSchedule {
  id: string;
  dayOfWeek: string;
  serviceName: string;
  startTime: string;
  endTime: string | null;
  description: string | null;
  location: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface ChurchLocation {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  isMainLocation: boolean;
  isActive: boolean;
}

export interface ChurchSocialLink {
  id: string;
  platform: string;
  url: string;
  displayName: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface CoreValue {
  title: string;
  description: string;
}

export interface ChurchProfileData {
  id: string;
  name: string;
  shortName: string | null;
  nameNative: string | null;
  description: string | null;
  welcomeMessage: string | null;
  history: string | null;
  vision: string | null;
  mission: string | null;
  beliefs: string | null;
  coreValues: string | null; // JSON string of CoreValue[]
  worshipInfo: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  ogImageUrl: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  denomination: string | null;
  language: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  serviceSchedules: ChurchServiceSchedule[];
  locations: ChurchLocation[];
  socialLinks: ChurchSocialLink[];
}

// ============================================================
// Fetcher
// ============================================================

const PROFILE_ENDPOINT = '/api/v1/church/profile';

/**
 * Fetch the church profile from the public API.
 * For server components, pass an absolute baseUrl.
 * For client components, the hook should be used instead.
 */
export async function getChurchProfile(
  baseUrl?: string
): Promise<ChurchProfileData | null> {
  const url = baseUrl ? `${baseUrl}${PROFILE_ENDPOINT}` : PROFILE_ENDPOINT;
  const fetchOptions: RequestInit & { next?: { revalidate: number } } = {};
  // Only add revalidate for server-side fetches (when baseUrl is provided)
  if (baseUrl) {
    fetchOptions.next = { revalidate: 300 }; // 5 min cache
  }
  const res = await fetch(url, fetchOptions);

  if (!res.ok) return null;

  const json: ApiResponse<ChurchProfileData> = await res.json();
  if (!json.success || !json.data) return null;

  return json.data;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Convert "HH:MM" 24h format to "h:mm AM/PM" 12h format.
 */
function to12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format a time range like "09:00" – "12:00" → "9:00 AM – 12:00 PM".
 */
export function formatTimeRange(
  startTime: string,
  endTime?: string | null
): string {
  const start = to12h(startTime);
  if (!endTime) return start;
  return `${start} – ${to12h(endTime)}`;
}

/**
 * Safely parse the coreValues JSON string into an array of CoreValue objects.
 * Returns an empty array on failure.
 */
export function parseCoreValues(raw: string | null | undefined): CoreValue[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (v): v is CoreValue =>
          typeof v === 'object' && v !== null && typeof v.title === 'string'
      );
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Parse beliefs text (newline-separated) into {id, title, content} items.
 * Expects format: "Title\nContent\n\nTitle\nContent"
 */
export function parseBeliefs(
  raw: string | null | undefined
): Array<{ id: string; title: string; content: string }> {
  if (!raw) return [];
  const blocks = raw.split(/\n\s*\n/).filter((b) => b.trim());
  return blocks.map((block, index) => {
    const lines = block.trim().split('\n');
    const title = lines[0]?.trim() ?? `Belief ${index + 1}`;
    const content = lines.slice(1).join(' ').trim();
    return {
      id: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || `belief-${index + 1}`,
      title,
      content,
    };
  });
}

/**
 * Get the icon name for a core value title (maps to lucide-react icons).
 */
export function getCoreValueIcon(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('faith') || lower.includes('እምነት')) return 'Shield';
  if (lower.includes('worship') || lower.includes('ወድቀት')) return 'Church';
  if (lower.includes('communit') || lower.includes('ማኅበር')) return 'Users';
  if (lower.includes('service') || lower.includes('አገልግሎት')) return 'HandHeart';
  if (lower.includes('educat') || lower.includes('ትምህርት')) return 'GraduationCap';
  if (lower.includes('unit') || lower.includes('አንድነት')) return 'Link2';
  if (lower.includes('love') || lower.includes('ፍቅር')) return 'Heart';
  if (lower.includes('hope') || lower.includes('ተስፋ')) return 'Sparkles';
  return 'Star';
}

/**
 * Get the lucide-react icon component for a social platform.
 */
export function getSocialPlatformIcon(platform: string): string {
  const p = platform.toLowerCase();
  if (p === 'facebook') return 'Facebook';
  if (p === 'youtube') return 'Youtube';
  if (p === 'telegram' || p === 'send') return 'Send';
  if (p === 'x' || p === 'twitter') return 'Twitter';
  if (p === 'instagram') return 'Instagram';
  if (p === 'tiktok') return 'Music';
  return 'ExternalLink';
}
