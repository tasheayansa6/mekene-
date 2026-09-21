import { db } from '@/lib/db';
import { error, success, validationError } from '@/lib/api/response';
import { readJson } from '@/lib/auth/http';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { logContentChange, sanitizeOptionalUrl, sanitizePlainText, uniqueContentSlug, unsafeUrlError } from '@/lib/content/admin-write';
import { eventLocationWriteSchema, formatZodErrors } from '@/lib/events/validation';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'events', 'view');
  if (!auth.ok) return auth.error;
  const rows = await db.eventLocation.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { events: true } } },
  });
  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      address: row.address,
      description: row.description,
      latitude: row.latitude,
      longitude: row.longitude,
      mapUrl: row.mapUrl,
      capacity: row.capacity,
      facilities: row.facilities,
      isActive: row.isActive,
      usage: row._count.events,
    }))
  );
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'events', 'create');
  if (!auth.ok) return auth.error;
  const parsed = eventLocationWriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  try {
    sanitizeOptionalUrl(parsed.data.mapUrl);
  } catch {
    return unsafeUrlError();
  }
  const slug = await uniqueContentSlug('eventLocation', parsed.data.name, parsed.data.slug);
  const existing = await db.eventLocation.findUnique({ where: { slug } });
  if (existing) return error('A location with this slug already exists.', 409);
  const row = await db.eventLocation.create({
    data: {
      name: sanitizePlainText(parsed.data.name, 120),
      slug,
      address: parsed.data.address ? sanitizePlainText(parsed.data.address, 240) : null,
      description: parsed.data.description ? sanitizePlainText(parsed.data.description, 400) : null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      mapUrl: sanitizeOptionalUrl(parsed.data.mapUrl),
      capacity: parsed.data.capacity ?? null,
      facilities: parsed.data.facilities ? sanitizePlainText(parsed.data.facilities, 1000) : null,
      isActive: parsed.data.isActive ?? true,
    },
  });
  await logContentChange({
    type: 'event.created',
    entity: 'event_location',
    entityId: row.id,
    userId: auth.user.id,
    request,
    details: { name: row.name },
  });
  return success(row, 'Location created.', 201);
}
