import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageCampaigns, canViewGiving } from '@/lib/giving/access';
import { categoryUpsertSchema } from '@/lib/giving/validation';
import { parseMoney } from '@/lib/giving/money';
import { serializeCategory } from '@/lib/giving/serialize';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'giving', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user)) return forbidden();

  const rows = await db.donationCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return success({ categories: rows.map(serializeCategory) });
}

export async function POST(request: Request) {
  const auth = await guardAdminWrite(request, 'giving', 'publish');
  if (!auth.ok) return auth.error;
  if (!canManageCampaigns(auth.user)) return forbidden();

  const parsed = categoryUpsertSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const minAmount = parseMoney(parsed.data.minAmount || '1.00');
  if (!minAmount) return error('Invalid minimum amount.', 400);
  const maxAmount =
    parsed.data.maxAmount === undefined || parsed.data.maxAmount === null
      ? null
      : parseMoney(parsed.data.maxAmount);
  if (parsed.data.maxAmount && !maxAmount) return error('Invalid maximum amount.', 400);

  const created = await db.donationCategory.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug || slugify(parsed.data.name),
      description: parsed.data.description || null,
      isActive: parsed.data.isActive ?? true,
      sortOrder: parsed.data.sortOrder ?? 100,
      minAmount,
      maxAmount,
    },
  });

  return success({ category: serializeCategory(created) }, 'Category created.', 201);
}
