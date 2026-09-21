import { MemberAttendanceDetail } from '@/components/admin/attendance/MemberAttendanceDetail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberAttendanceDetail id={id} />;
}
