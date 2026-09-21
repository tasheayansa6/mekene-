import { db } from '@/lib/db';
import { notFound, success } from '@/lib/api/response';
import { authorSelect, promoteScheduledContent, serializeAuthor, seoDefaults } from '@/lib/content/query';
import { isPubliclyVisible, publicStatusWhere } from '@/lib/content/status';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  await promoteScheduledContent();
  const { slug } = await context.params;
  const article = await db.newsArticle.findUnique({
    where: { slug },
    include: {
      author: { select: authorSelect },
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true, slug: true } } } },
    },
  });
  if (!article || !isPubliclyVisible(article)) return notFound('Article');

  const related = await db.newsArticle.findMany({
    where: {
      AND: [
        publicStatusWhere(),
        { id: { not: article.id } },
        article.categoryId ? { categoryId: article.categoryId } : {},
      ],
    },
    take: 3,
    orderBy: { publishedAt: 'desc' },
    select: { title: true, slug: true, excerpt: true, publishedAt: true, featuredImageUrl: true },
  });

  const seo = seoDefaults(article);
  return success({
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    content: article.content,
    featuredImageUrl: article.featuredImageUrl,
    featuredImageAlt: article.featuredImageAlt,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    category: article.category,
    tags: article.tags.map((item) => item.tag),
    author: serializeAuthor(article.author),
    related: related.map((item) => ({
      ...item,
      publishedAt: item.publishedAt?.toISOString() ?? null,
    })),
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    ogImage: seo.ogImage,
  });
}
