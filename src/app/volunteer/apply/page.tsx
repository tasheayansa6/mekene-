'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import MemberVolunteerApplyPage from '@/app/member/volunteering/apply/page';

export default function VolunteerApplyPage() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <MemberVolunteerApplyPage />
      </div>
    </AuthGuard>
  );
}
