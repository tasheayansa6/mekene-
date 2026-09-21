import { AttendanceOverview } from '@/components/admin/attendance/AttendanceOverview';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <AttendanceOverview focusToday={view === 'today'} />;
}
