const UNSAFE_HREF = /^\s*(javascript|data|vbscript):/i;

export function sanitizeMenuHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) {
    throw new Error('empty-href');
  }
  if (UNSAFE_HREF.test(trimmed)) {
    throw new Error('unsafe-href');
  }
  if (trimmed.startsWith('/')) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  throw new Error('invalid-href');
}

/** Returns true if assigning parentId would create a cycle in the parent chain. */
export function wouldCreateCircularParent(
  itemId: string | null,
  parentId: string | null,
  parentById: ReadonlyMap<string, string | null>
): boolean {
  if (!parentId) return false;
  if (itemId && parentId === itemId) return true;

  let current: string | null = parentId;
  const visited = new Set<string>();
  while (current) {
    if (itemId && current === itemId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    current = parentById.get(current) ?? null;
  }
  return false;
}
