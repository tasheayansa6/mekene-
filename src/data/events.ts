export interface EventData {
  slug: string;
  title: string;
  date: string;
  endDate?: string;
  location?: string;
  description: string;
  isRecurring?: boolean;
  fullDescription?: string;
}

/**
 * Legacy placeholder. Public events come from published database records.
 * Do not add invented church events here.
 */
export const eventsData: EventData[] = [];
export const pastEventsData: EventData[] = [];

export function getEventBySlug(slug: string): EventData | undefined {
  return [...eventsData, ...pastEventsData].find((event) => event.slug === slug);
}
