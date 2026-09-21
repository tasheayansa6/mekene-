import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forbidden } from '@/lib/api/response';
import { guardAdminRead } from '@/lib/admin/guard';
import { canExportGiving } from '@/lib/giving/access';
import { emitGivingEvent } from '@/lib/giving/events';
import { contributionStatusLabel, paymentMethodLabel } from '@/lib/giving/status';
import { moneyToString, netContributionAmount } from '@/lib/giving/money';

export async function GET(request: Request) {
  const auth = await guardAdminRead(request, 'giving', 'manage');
  if (!auth.ok) return auth.error;
  if (!canExportGiving(auth.user)) return forbidden();

  const rows = await db.contribution.findMany({
    include: {
      category: { select: { name: true } },
      campaign: { select: { title: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });

  const header = [
    'reference',
    'receipt_number',
    'date',
    'amount',
    'refunded',
    'net',
    'currency',
    'status',
    'method',
    'category',
    'campaign',
    'anonymous',
    'donor_name',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    const donor =
      row.isAnonymous
        ? 'Anonymous'
        : row.user
          ? `${row.user.firstName} ${row.user.lastName}`.trim()
          : row.guestName || '';
    lines.push(
      [
        csv(row.reference),
        csv(row.receiptNumber || ''),
        csv(row.createdAt.toISOString()),
        csv(moneyToString(row.amount)),
        csv(moneyToString(row.refundedAmount)),
        csv(moneyToString(netContributionAmount(row.amount, row.refundedAmount))),
        csv(row.currency),
        csv(contributionStatusLabel(row.status)),
        csv(paymentMethodLabel(row.paymentMethod)),
        csv(row.category.name),
        csv(row.campaign?.title || ''),
        csv(row.isAnonymous ? 'yes' : 'no'),
        csv(donor),
      ].join(',')
    );
  }

  await emitGivingEvent({
    type: 'giving.exported',
    userId: auth.user.id,
    request,
    details: { count: rows.length },
  });

  return new NextResponse(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="giving-export.csv"',
    },
  });
}

function csv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
