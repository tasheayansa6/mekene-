export interface HomepageSectionLike {
  key: string;
  isEnabled: boolean;
}

/** When CMS sections exist, respect isEnabled; otherwise show all sections (legacy layout). */
export function isHomepageSectionEnabled(
  sections: HomepageSectionLike[] | undefined,
  key: string
): boolean {
  if (!sections || sections.length === 0) return true;
  const match = sections.find((section) => section.key === key);
  if (!match) return true;
  return match.isEnabled;
}
