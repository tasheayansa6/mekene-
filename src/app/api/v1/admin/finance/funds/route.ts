import { db } from '@/lib/db';
import { error, forbidden, success, validationError } from '@/lib/api/response';
import { guardAdminRead, guardAdminWrite } from '@/lib/admin/guard';
import { formatZodErrors } from '@/lib/auth/validation';
import { readJson } from '@/lib/auth/http';
import { canManageCampaigns, canViewGiving } from '@/lib/giving/access';
import { categoryPatchSchema, categoryUpsertSchema } from '@/lib/giving/validation';
import { parseMoney } from '@/lib/giving/money';
import { serializeCategory } from '@/lib/giving/serialize';
import {
  formatCurrencyList,
  stringifyPresetAmounts,
} from '@/lib/giving/currency';
import { emitGivingEvent } from '@/lib/giving/events';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

const categoryInclude = {} as const;

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'giving', 'view');
  if (!auth.ok) return auth.error;
  if (!canViewGiving(auth.user)) return forbidden();

  const rows = await db.donationCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return success({ funds: rows.map(serializeCategory), categories: rows.map(serializeCategory) });
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
      isPublic: parsed.data.isPublic ?? true,
      sortOrder: parsed.data.sortOrder ?? 100,
      minAmount,
      maxAmount,
      supportedCurrencies: parsed.data.supportedCurrencies
        ? formatCurrencyList(parsed.data.supportedCurrencies)
        : 'ETB',
      presetAmounts: parsed.data.presetAmounts
        ? stringifyPresetAmounts(parsed.data.presetAmounts)
        : null,
      accountingCode: parsed.data.accountingCode || null,
      ministryId: parsed.data.ministryId || null,
      eventId: parsed.data.eventId || null,
    },
  });

  await emitGivingEvent({
    type: 'giving.fund_created',
    entityId: created.id,
    userId: auth.user.id,
    request,
    details: { slug: created.slug },
  });

  return success({ fund: serializeCategory(created), category: serializeCategory(created) }, 'Fund created.', 201);
}

export async function PATCH(request: Request) {
  const auth = await guardAdminWrite(request, 'giving', 'publish');
  if (!auth.ok) return auth.error;
  if (!canManageCampaigns(auth.user)) return forbidden();

  const body = (await readJson(request)) as { id?: string } & Record<string, unknown>;
  if (!body.id) return error('Fund id is required.', 400);
  const { id, ...rest } = body;
  const parsed = categoryPatchSchema.safeParse(rest);
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));

  const existing = await db.donationCategory.findUnique({ where: { id } });
  if (!existing) return error('Fund not found.', 404);

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.slug !== undefined) data.slug = parsed.data.slug;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.isPublic !== undefined) data.isPublic = parsed.data.isPublic;
  if (parsed.data.sortOrder !== undefined) data.sortOrder = parsed.data.sortOrder;
  if (parsed.data.minAmount !== undefined) {
    const minAmount = parseMoney(parsed.data.minAmount);
    if (!minAmount) return error('Invalid minimum amount.', 400);
    data.minAmount = minAmount;
  }
  if (parsed.data.maxAmount !== undefined) {
    if (parsed.data.maxAmount === null) data.maxAmount = null;
    else {
      const maxAmount = parseMoney(parsed.data.maxAmount);
      if (!maxAmount) return error('Invalid maximum amount.', 400);
      data.maxAmount = maxAmount;
    }
  }
  if (parsed.data.supportedCurrencies !== undefined) {
    data.supportedCurrencies = formatCurrencyList(parsed.data.supportedCurrencies);
  }
  if (parsed.data.presetAmounts !== undefined) {
    data.presetAmounts = stringifyPresetAmounts(parsed.data.presetAmounts);
  }
  if (parsed.data.accountingCode !== undefined) data.accountingCode = parsed.data.accountingCode;
  if (parsed.data.ministryId !== undefined) data.ministryId = parsed.data.ministryId;
  if (parsed.data.eventId !== undefined) data.eventId = parsed.data.eventId;

  const updated = await db.donationCategory.update({
    where: { id },
    data,
    include: categoryInclude,
  });

  await emitGivingEvent({
    type: 'giving.fund_updated',
    entityId: updated.id,
    userId: auth.user.id,
    request,
    details: { slug: updated.slug, isActive: updated.isActive },
  });

  return success({ fund: serializeCategory(updated), category: serializeCategory(updated) }, 'Fund updated.');
}
