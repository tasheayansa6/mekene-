import type { AuthUser } from '@/lib/auth/permissions';
import { canSeeRequesterIdentity } from './access';
import { isPubliclyListable, memberStatusLabel } from './status';

type CategoryRef = { id: string; name: string; slug: string } | null;
type UserNameRef = { id: string; firstName: string; lastName: string; email?: string } | null;

export const prayerAdminInclude = {
  category: { select: { id: true, name: true, slug: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    take: 50,
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  },
} as const;

export const prayerListInclude = {
  category: { select: { id: true, name: true, slug: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true } },
} as const;

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function displayName(user: { firstName: string; lastName: string } | null | undefined) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
}

export function serializePublicPrayer(row: {
  id: string;
  title: string;
  content: string;
  prayedCount: number;
  createdAt: Date;
  category: CategoryRef;
}) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    prayedCount: row.prayedCount,
    createdAt: row.createdAt.toISOString(),
    category: row.category ? { name: row.category.name, slug: row.category.slug } : null,
  };
}

export function serializeMemberPrayer(
  row: {
    id: string;
    title: string;
    content: string;
    isAnonymous: boolean;
    visibility: string;
    status: string;
    publicApproved: boolean;
    requesterMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    category: CategoryRef;
  },
  options?: { includeContent?: boolean }
) {
  return {
    id: row.id,
    title: row.title,
    content: options?.includeContent === false ? undefined : row.content,
    isAnonymous: row.isAnonymous,
    visibility: row.visibility,
    status: row.status,
    statusLabel: memberStatusLabel(row.status),
    publicApproved: row.publicApproved,
    requesterMessage: row.requesterMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
  };
}

export function serializeAdminListRow(row: {
  id: string;
  title: string;
  visibility: string;
  status: string;
  isAnonymous: boolean;
  publicApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: CategoryRef;
  assignedTo: UserNameRef;
}) {
  return {
    id: row.id,
    title: row.title,
    visibility: row.visibility,
    status: row.status,
    isAnonymous: row.isAnonymous,
    publicApproved: row.publicApproved,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    assignedTo: row.assignedTo
      ? { id: row.assignedTo.id, name: displayName(row.assignedTo) }
      : null,
  };
}

export function serializeAdminDetail(
  row: {
    id: string;
    title: string;
    content: string;
    userId: string | null;
    guestName: string | null;
    guestEmail: string | null;
    isAnonymous: boolean;
    visibility: string;
    status: string;
    categoryId: string | null;
    assignedToId: string | null;
    publicApproved: boolean;
    approvedAt: Date | null;
    answeredAt: Date | null;
    archivedAt: Date | null;
    rejectedAt: Date | null;
    prayedCount: number;
    requesterMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
    category: CategoryRef;
    assignedTo: UserNameRef;
    user: UserNameRef;
    notes?: Array<{
      id: string;
      body: string;
      createdAt: Date;
      author: { id: string; firstName: string; lastName: string };
    }>;
  },
  viewer: AuthUser
) {
  const showIdentity = canSeeRequesterIdentity(viewer);
  const requester = showIdentity
    ? {
        userId: row.userId,
        name: row.isAnonymous
          ? row.user
            ? `${displayName(row.user)} (anonymous to the public)`
            : row.guestName
              ? `${row.guestName} (anonymous to the public)`
              : 'Anonymous'
          : displayName(row.user) || row.guestName || 'Guest',
        email: row.user?.email || row.guestEmail || null,
        isGuest: !row.userId,
      }
    : {
        userId: null,
        name: row.isAnonymous ? 'Anonymous' : 'Hidden',
        email: null,
        isGuest: !row.userId,
      };

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    isAnonymous: row.isAnonymous,
    visibility: row.visibility,
    status: row.status,
    categoryId: row.categoryId,
    assignedToId: row.assignedToId,
    publicApproved: row.publicApproved,
    approvedAt: iso(row.approvedAt),
    answeredAt: iso(row.answeredAt),
    archivedAt: iso(row.archivedAt),
    rejectedAt: iso(row.rejectedAt),
    prayedCount: row.prayedCount,
    requesterMessage: row.requesterMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    category: row.category,
    assignedTo: row.assignedTo
      ? { id: row.assignedTo.id, name: displayName(row.assignedTo) }
      : null,
    requester,
    notes: (row.notes || []).map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      authorName: displayName(note.author),
    })),
    publiclyListed: isPubliclyListable(row),
  };
}
