import { paginated } from '@/lib/api/response';
import { getActiveAnnouncements } from '@/lib/content/public';
import { serializeAuthor } from '@/lib/content/query';

function publicAnnouncement(row: {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  priority: string;
  isFeatured: boolean;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  publishedAt: Date | null;
  startAt: Date;
  author: { id: string; firstName: string; lastName: string };
}) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    priority: row.priority,
    isFeatured: row.isFeatured,
    featuredImageUrl: row.featuredImageUrl,
    featuredImageAlt: row.featuredImageAlt,
    publishedAt: (row.publishedAt || row.startAt).toISOString(),
    author: serializeAuthor(row.author),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || '';
  const category = url.searchParams.get('category')?.trim() || '';
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const pageSize = Math.min(30, Math.max(1, Number(url.searchParams.get('pageSize') || 12)));

  const rows = await getActiveAnnouncements();
  let filtered = rows.filter((row) => row.audience === 'everyone');
  if (q) {
    const needle = q.toLowerCase();
    filtered = filtered.filter(
      (row) =>
        row.title.toLowerCase().includes(needle) ||
        row.excerpt.toLowerCase().includes(needle) ||
        row.content.toLowerCase().includes(needle)
    );
  }
  if (category) {
    filtered = filtered.filter((row) => row.category === category);
  }

  const totalItems = filtered.length;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const categories = [
    ...new Set(rows.filter((r) => r.audience === 'everyone').map((r) => r.category)),
  ].sort();

  return paginated(pageRows.map(publicAnnouncement), { page, pageSize, totalItems }, {
    categories,
  });
}
