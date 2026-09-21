import type { Metadata } from 'next';
import { MemberShell } from './_components/member-shell';

export const metadata: Metadata = {
  title: 'Member portal',
  robots: { index: false, follow: false },
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <MemberShell>{children}</MemberShell>;
}
