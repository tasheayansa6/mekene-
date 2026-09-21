'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '@/lib/api/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionRow {
  id: string;
  resource: string;
  action: string;
  description: string | null;
}

export default function AdminPermissionsPage() {
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiGet<{ permissions: PermissionRow[] }>('/admin/permissions').then(
      (result) => {
        setPermissions(result.data?.permissions || []);
        setLoading(false);
      }
    );
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const permission of permissions) {
      const list = map.get(permission.resource) || [];
      list.push(permission);
      map.set(permission.resource, list);
    }
    return map;
  }, [permissions]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Permissions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These permissions are stored in the database and enforced by the API.
          They control view, create, update, delete, publish, archive, and manage
          actions on each resource.
        </p>
      </div>
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        Array.from(grouped.entries()).map(([resource, rows]) => (
          <div key={resource} className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48 capitalize">{resource}</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))
      )}
    </div>
  );
}
