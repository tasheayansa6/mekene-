import { db } from '@/lib/db';
import { sanitizeMarkdown, sanitizePlainText } from '@/lib/content/sanitize';

export const CHURCH_LANGUAGES = ['en', 'om', 'am'] as const;
export type ChurchLanguage = (typeof CHURCH_LANGUAGES)[number];

export interface TranslationFallback {
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export async function upsertTranslation(input: {
  entityType: string;
  entityId: string;
  language: string;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  status?: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
  translatorId?: string | null;
}) {
  if (!CHURCH_LANGUAGES.includes(input.language as ChurchLanguage)) {
    throw new Error('unsupported-language');
  }

  return db.contentTranslation.upsert({
    where: {
      entityType_entityId_language: {
        entityType: input.entityType,
        entityId: input.entityId,
        language: input.language,
      },
    },
    create: {
      entityType: input.entityType,
      entityId: input.entityId,
      language: input.language,
      title: input.title ? sanitizePlainText(input.title, 180) : null,
      excerpt: input.excerpt ? sanitizePlainText(input.excerpt, 400) : null,
      content: input.content ? sanitizeMarkdown(input.content) : null,
      seoTitle: input.seoTitle ? sanitizePlainText(input.seoTitle, 70) : null,
      seoDescription: input.seoDescription ? sanitizePlainText(input.seoDescription, 160) : null,
      status: input.status ?? 'draft',
      translatorId: input.translatorId ?? null,
    },
    update: {
      title: input.title === undefined ? undefined : input.title ? sanitizePlainText(input.title, 180) : null,
      excerpt:
        input.excerpt === undefined ? undefined : input.excerpt ? sanitizePlainText(input.excerpt, 400) : null,
      content: input.content === undefined ? undefined : input.content ? sanitizeMarkdown(input.content) : null,
      seoTitle:
        input.seoTitle === undefined ? undefined : input.seoTitle ? sanitizePlainText(input.seoTitle, 70) : null,
      seoDescription:
        input.seoDescription === undefined
          ? undefined
          : input.seoDescription
            ? sanitizePlainText(input.seoDescription, 160)
            : null,
      status: input.status,
      translatorId: input.translatorId,
    },
    include: {
      translator: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function listTranslations(entityType: string, entityId: string) {
  return db.contentTranslation.findMany({
    where: { entityType, entityId },
    orderBy: { language: 'asc' },
    include: {
      translator: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function getTranslation(id: string) {
  return db.contentTranslation.findUnique({
    where: { id },
    include: {
      translator: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function publishTranslation(id: string) {
  return db.contentTranslation.update({
    where: { id },
    data: {
      status: 'published',
      publishedAt: new Date(),
    },
    include: {
      translator: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function getTranslatedContent(
  entityType: string,
  entityId: string,
  language: string,
  fallback: TranslationFallback = {},
  fallbackLanguage: ChurchLanguage = 'en'
) {
  const targetLang = CHURCH_LANGUAGES.includes(language as ChurchLanguage)
    ? language
    : fallbackLanguage;

  const translation = await db.contentTranslation.findUnique({
    where: {
      entityType_entityId_language: {
        entityType,
        entityId,
        language: targetLang,
      },
    },
  });

  if (translation?.status === 'published') {
    return {
      language: targetLang,
      translated: true,
      title: translation.title ?? fallback.title ?? null,
      excerpt: translation.excerpt ?? fallback.excerpt ?? null,
      content: translation.content ?? fallback.content ?? null,
      seoTitle: translation.seoTitle ?? fallback.seoTitle ?? null,
      seoDescription: translation.seoDescription ?? fallback.seoDescription ?? null,
    };
  }

  if (targetLang !== fallbackLanguage) {
    return getTranslatedContent(entityType, entityId, fallbackLanguage, fallback, fallbackLanguage);
  }

  return {
    language: fallbackLanguage,
    translated: false,
    title: fallback.title ?? null,
    excerpt: fallback.excerpt ?? null,
    content: fallback.content ?? null,
    seoTitle: fallback.seoTitle ?? null,
    seoDescription: fallback.seoDescription ?? null,
  };
}
