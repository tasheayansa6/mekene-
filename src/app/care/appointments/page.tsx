import { redirect } from 'next/navigation';

/** Appointments are managed from the member care dashboard. */
export default function CareAppointmentsPage() {
  redirect('/member/care');
}
