import { PageHeader } from '@/components/admin/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminHelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Help" description="How to use the church administration dashboard." />
      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Use the sidebar to open a module you are authorized to manage.</p>
          <p>Search with Ctrl+K to find users, ministries, and leaders.</p>
          <p>Destructive actions ask for confirmation before they run.</p>
          <p>If a section is marked Coming Soon, it belongs to a later implementation phase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
