export type SermonCategory =
  | 'Sunday Sermon'
  | 'Bible Study'
  | 'Feast Day'
  | 'Special Event';

export interface SermonData {
  slug: string;
  title: string;
  speaker: string;
  date: string;
  description: string;
  fullDescription?: string;
  scriptureReference?: string;
  category: SermonCategory;
  thumbnailUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
}

/**
 * Legacy placeholder. The public sermon library reads published database records.
 * Do not add invented church sermons here.
 */
export const sermonsData: SermonData[] = [];

export function getSermonBySlug(slug: string): SermonData | undefined {
  return sermonsData.find((s) => s.slug === slug);
}

export function getRelatedSermons(
  currentSlug: string,
  limit = 3
): SermonData[] {
  const current = getSermonBySlug(currentSlug);
  if (!current) return sermonsData.slice(0, limit);
  return sermonsData
    .filter(
      (s) =>
        s.slug !== currentSlug &&
        (s.speaker === current.speaker || s.category === current.category)
    )
    .slice(0, limit);
}
