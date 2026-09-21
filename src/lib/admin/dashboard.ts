export interface DashboardStats {
  users: { total: number; active: number };
  ministries: { total: number; active: number };
  leadership: { total: number; active: number };
  church: {
    hasProfile: boolean;
    status: string | null;
    locations: number;
    services: number;
  };
  prayer: {
    new: number;
    underReview: number;
    assigned: number;
    praying: number;
    answered: number;
  } | null;
  attendance: {
    openSessions: number;
    todayCheckedIn: number;
  } | null;
}

export function buildDashboardStats(input: {
  usersTotal: number;
  usersActive: number;
  ministriesTotal: number;
  ministriesActive: number;
  leadersTotal: number;
  leadersActive: number;
  churchProfile: { status: string } | null;
  locationCount: number;
  serviceCount: number;
  prayer?: {
    new: number;
    underReview: number;
    assigned: number;
    praying: number;
    answered: number;
  } | null;
  attendance?: {
    openSessions: number;
    todayCheckedIn: number;
  } | null;
}): DashboardStats {
  return {
    users: {
      total: input.usersTotal,
      active: input.usersActive,
    },
    ministries: {
      total: input.ministriesTotal,
      active: input.ministriesActive,
    },
    leadership: {
      total: input.leadersTotal,
      active: input.leadersActive,
    },
    church: {
      hasProfile: Boolean(input.churchProfile),
      status: input.churchProfile?.status ?? null,
      locations: input.locationCount,
      services: input.serviceCount,
    },
    prayer: input.prayer ?? null,
    attendance: input.attendance ?? null,
  };
}

export const COMING_SOON_STAT_CARDS = [
  'Upcoming Events',
  'Published Sermons',
  'Unread Notifications',
] as const;
