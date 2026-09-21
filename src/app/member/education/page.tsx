'use client';

import Link from 'next/link';
import { BookOpen, ClipboardList, Award, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function MemberEducationHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Education</h1>
        <p className="text-sm text-muted-foreground">
          Your Bible school courses, assignments, grades, and certificates.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="size-4" />
              My courses
            </CardTitle>
            <CardDescription>Enrollments and available courses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/member/education/courses">Open courses</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4" />
              Assignments
            </CardTitle>
            <CardDescription>Submit work for your enrolled courses.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/member/education/assignments">View assignments</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="size-4" />
              Grades
            </CardTitle>
            <CardDescription>Course scores and letter grades.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/member/education/grades">View grades</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="size-4" />
              Certificates
            </CardTitle>
            <CardDescription>Issued certificates and verification codes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href="/member/education/certificates">View certificates</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Button asChild variant="link" className="px-0">
        <Link href="/education">Browse public education hub</Link>
      </Button>
    </div>
  );
}
