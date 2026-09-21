import { db } from '@/lib/db';
import { notFound, redirectResponse, success } from '@/lib/api/response';
import { authorSelect, promoteScheduledContent, serializeAuthor, seoDefaults } from '@/lib/content/query';
import { isPubliclyVisible } from '@/lib/content/status';
import { resolvePageRedirect } from '@/lib/cms/redirects';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  await promoteScheduledContent();
  const { slug } = await context.params;

  const redirectSlug = await resolvePageRedirect(slug);
  if (redirectSlug) {
    return redirectResponse(`/pages/${redirectSlug}`, _request, 301);
  }

  const page = await db.cmsPage.findUnique({
    where: { slug },
    include: { author: { select: authorSelect } },
  });
  if (!page || !isPubliclyVisible(page)) return notFound('Page');

  const seo = seoDefaults(page);
  return success({
    id: page.id,
    title: page.title,
    slug: page.slug,
    excerpt: page.excerpt,
    content: page.content,
    featuredImageUrl: page.featuredImageUrl,
    featuredImageAlt: page.featuredImageAlt,
    publishedAt: page.publishedAt?.toISOString() ?? null,
    updatedAt: page.updatedAt.toISOString(),
    author: serializeAuthor(page.author),
    seoTitle: seo.seoTitle,
    seoDescription: seo.seoDescription,
    ogImage: seo.ogImage,
  });
}
