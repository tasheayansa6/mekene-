import { db } from '@/lib/db';
import { error, forbidden, paginated, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import {
  enforceFeaturedLimit,
  logContentChange,
  revalidatePublicContent,
  uniqueContentSlug,
} from '@/lib/content/admin-write';
import { RESERVED_EVENT_SLUGS, eventWhereForUser } from '@/lib/events/access';
import { churchTimezone } from '@/lib/events/public';
import { eventInclude, serializeEvent } from '@/lib/events/serialize';
import { adminEventListSchema, eventWriteSchema, formatZodErrors } from '@/lib/events/validation';
import { prepareEventFields, resolveMinistryForWrite } from '@/lib/events/write';
import { validateEventScheduling } from '@/lib/events/conflicts';
import { parseEventDateTime } from '@/lib/events/timezone';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  const url = new URL(request.url);
  const parsed = adminEventListSchema.safeParse({
    q: url.searchParams.get('q') || undefined,
    page: url.searchParams.get('page') || 1,
    pageSize: url.searchParams.get('pageSize') || 20,
    status: url.searchParams.get('status') || undefined,
    category: url.searchParams.get('category') || undefined,
    ministry: url.searchParams.get('ministry') || undefined,
    location: url.searchParams.get('location') || undefined,
    featured: url.searchParams.get('featured') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    dir: url.searchParams.get('dir') || undefined,
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const { q, page, pageSize, status, category, ministry, location, featured, sort, dir } = parsed.data;
  const scoped = eventWhereForUser(auth.user);
  const and: object[] = [];
  if (scoped) and.push(scoped);
  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { shortDescription: { contains: q } },
        { organizerName: { contains: q } },
        { ministry: { name: { contains: q } } },
        { location: { name: { contains: q } } },
      ],
    });
  }
  if (status) and.push({ status });
  if (category) and.push({ categoryId: category });
  if (ministry) and.push({ ministryId: ministry });
  if (location) and.push({ locationId: location });
  if (featured === 'true') and.push({ isFeatured: true });
  const where = and.length ? { AND: and } : {};
  const orderField = ['title', 'status', 'updatedAt', 'startAt', 'endAt'].includes(sort || '')
    ? sort!
    : 'updatedAt';

  const [totalItems, rows] = await Promise.all([
    db.event.count({ where }),
    db.event.findMany({
      where,
      include: eventInclude,
      orderBy: { [orderField]: dir === 'asc' ? 'asc' : 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return paginated(
    rows.map((row) => serializeEvent(row)),
    { page, pageSize, totalItems }
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'events', 'create');
  if (!auth.ok) return auth.error;
  const parsed = eventWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const data = parsed.data;
  if (data.slug && RESERVED_EVENT_SLUGS.has(data.slug)) {
    return error('That slug is reserved.', 409);
  }
  const ministry = await resolveMinistryForWrite(auth.user, data.ministryId);
  if (!ministry.ok) return forbidden(ministry.error);
  const prepared = prepareEventFields(data, {
    user: auth.user,
    defaultTimezone: await churchTimezone(),
  });
  if (!prepared.ok) return validationError(prepared.errors);
  const startAt = (prepared.fields.startAt as Date) || parseEventDateTime(data.startAt, String(prepared.fields.timezone || 'Africa/Addis_Ababa'));
  const endAt = (prepared.fields.endAt as Date) || parseEventDateTime(data.endAt, String(prepared.fields.timezone || 'Africa/Addis_Ababa'));
  const scheduling = await validateEventScheduling({
    locationId: (prepared.fields.locationId as string | null | undefined) ?? data.locationId,
    startAt,
    endAt,
    capacity: (prepared.fields.capacity as number | null | undefined) ?? data.capacity ?? null,
    allowOverVenueCapacity: data.allowOverVenueCapacity,
    allowVenueConflict: data.allowVenueConflict,
  });
  if (!scheduling.ok) {
    return validationError({
      scheduling: scheduling.errors.map((c) => c.message),
    });
  }
  const slug = await uniqueContentSlug('event', data.title, data.slug);
  const row = await db.event.create({
    data: {
      ...(prepared.fields as object),
      slug,
      ministryId: ministry.ministryId,
      authorId: auth.user.id,
      status: prepared.resolved.status,
      publishedAt: prepared.resolved.publishedAt,
    } as never,
    include: eventInclude,
  });
  if (row.isFeatured) await enforceFeaturedLimit('event', row.id);
  await logContentChange({
    type: prepared.resolved.status === 'published' ? 'event.published' : 'event.created',
    entity: 'event',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { slug: row.slug, status: row.status },
  });
  revalidatePublicContent([`/events/${row.slug}`, '/events/past']);
  return success(
    { ...serializeEvent(row), schedulingWarnings: scheduling.warnings },
    'Event created as a draft unless you published it.',
    201
  );
}
