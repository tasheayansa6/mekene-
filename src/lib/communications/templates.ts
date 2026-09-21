import { db } from '@/lib/db';

export const ALLOWED_TEMPLATE_VARS = [
  'member_name',
  'event_name',
  'event_date',
  'event_time',
  'venue',
  'church_name',
  'ministry_name',
] as const;

export type TemplateVariable = (typeof ALLOWED_TEMPLATE_VARS)[number];

const VAR_PATTERN = /\{\{(\w+)\}\}/g;
const allowedSet = new Set<string>(ALLOWED_TEMPLATE_VARS);

/** Replace `{{var}}` placeholders — allowlisted keys only; never evaluates code. */
export function renderTemplate(body: string, vars: Record<string, string | undefined>): string {
  return body.replace(VAR_PATTERN, (_match, key: string) => {
    if (!allowedSet.has(key)) return `{{${key}}}`;
    return vars[key] ?? '';
  });
}

export function extractTemplateVariables(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(VAR_PATTERN)) {
    found.add(match[1]);
  }
  return [...found];
}

export function validateTemplateVariables(
  body: string
): { ok: true } | { ok: false; unknown: string[] } {
  const unknown = extractTemplateVariables(body).filter((v) => !allowedSet.has(v));
  if (unknown.length > 0) return { ok: false, unknown };
  return { ok: true };
}

export async function listCommunicationTemplates(input?: {
  category?: string;
  activeOnly?: boolean;
  take?: number;
}) {
  return db.communicationTemplate.findMany({
    where: {
      ...(input?.category ? { category: input.category } : {}),
      ...(input?.activeOnly ? { isActive: true } : {}),
    },
    orderBy: { name: 'asc' },
    take: input?.take ?? 100,
  });
}

export async function getCommunicationTemplateById(id: string) {
  return db.communicationTemplate.findUnique({ where: { id } });
}

export async function getCommunicationTemplateBySlug(slug: string) {
  return db.communicationTemplate.findUnique({ where: { slug } });
}
