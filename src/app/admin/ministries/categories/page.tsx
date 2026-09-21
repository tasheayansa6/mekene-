'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api/client';
import { PageHeader } from '@/components/admin/PageHeader';
import { PermissionGate } from '@/components/admin/PermissionGate';
import { AdminDataTable, type AdminColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';

interface CategoryRow {
  name: string;
  count: number;
}

export default function MinistryCategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<CategoryRow[]>('/admin/ministries/categories').then((result) => {
      setRows(result.data || []);
      setError(result.success ? null : result.message);
      setLoading(false);
    });
  }, []);

  const columns: AdminColumn<CategoryRow>[] = [
    { key: 'name', header: 'Category' },
    { key: 'count', header: 'Ministries' },
  ];

  return (
    <PermissionGate permission="ministries.view">
      <div className="space-y-6">
        <PageHeader
          title="Ministry Categories"
          description="Categories are derived from ministry records. Assign a category when editing a ministry."
        />
        <AdminDataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.name}
          loading={loading}
          error={error}
          emptyTitle="No categories yet."
          emptyDescription="Add a category when creating or editing a ministry."
          emptyAction={
            <Button asChild>
              <Link href="/admin/ministries">View ministries</Link>
            </Button>
          }
        />
      </div>
    </PermissionGate>
  );
}
