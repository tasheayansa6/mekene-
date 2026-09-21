export interface CalendarDay {
  date: string;
  inMonth: boolean;
  weekday: number;
}

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function ymd(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function monthGrid(year: number, month: number): CalendarDay[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prev = shiftMonth(year, month, -1);
  const prevDays = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  const next = shiftMonth(year, month, 1);
  const cells: CalendarDay[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    const day = prevDays - firstWeekday + 1 + i;
    cells.push({ date: ymd(prev.year, prev.month, day), inMonth: false, weekday: i });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: ymd(year, month, day),
      inMonth: true,
      weekday: (firstWeekday + day - 1) % 7,
    });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      date: ymd(next.year, next.month, nextDay),
      inMonth: false,
      weekday: cells.length % 7,
    });
    nextDay += 1;
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

export { shiftMonth };
