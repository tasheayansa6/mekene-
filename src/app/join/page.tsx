import { redirect } from 'next/navigation';

/** Alias for membership application workflow. */
export default function JoinPage() {
  redirect('/membership/apply');
}
