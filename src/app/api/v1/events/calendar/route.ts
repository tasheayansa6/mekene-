import { error, success, validationError } from '@/lib/api/response';
import { calendarQuerySchema, formatZodErrors } from '@/lib/events/validation';
import { getCalendarOccurrences } from '@/lib/events/public';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = calendarQuerySchema.safeParse({
    from: url.searchParams.get('from') || '',
    to: url.searchParams.get('to') || '',
  });
  if (!parsed.success) return validationError(formatZodErrors(parsed.error));
  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return error('Provide a valid date range.', 422);
  }
  const occurrences = await getCalendarOccurrences(from, to);
  return success({ from: from.toISOString(), to: to.toISOString(), occurrences });
}
