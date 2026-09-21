'use client';

import { useMemo } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { ApiErrorAlert } from '@/components/admin/ApiErrorAlert';
import { cn } from '@/lib/utils';

export interface AdminColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  hideOnMobile?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface BulkAction {
  id: string;
  label: string;
  destructive?: boolean;
}

interface AdminDataTableProps<T> {
  columns: AdminColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  errorStatus?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  rowActions?: (row: T) => React.ReactNode;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedChange?: (ids: string[]) => void;
  bulkActions?: BulkAction[];
  onBulkAction?: (actionId: string) => void;
  toolbar?: React.ReactNode;
}

export function AdminDataTable<T>({
  columns,
  rows,
  getRowId,
  loading,
  error,
  errorStatus,
  emptyTitle = 'No records found.',
  emptyDescription,
  emptyAction,
  search,
  onSearchChange,
  searchPlaceholder = 'Search',
  filters,
  sortKey,
  sortDir,
  onSort,
  page = 1,
  pageSize = 20,
  totalItems = 0,
  onPageChange,
  rowActions,
  selectable,
  selectedIds = [],
  onSelectedChange,
  bulkActions,
  onBulkAction,
  toolbar,
}: AdminDataTableProps<T>) {
  const allIds = useMemo(() => rows.map(getRowId), [rows, getRowId]);
  const allSelected = selectable && allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  function toggleAll(checked: boolean) {
    if (!onSelectedChange) return;
    onSelectedChange(checked ? allIds : []);
  }

  function toggleOne(id: string, checked: boolean) {
    if (!onSelectedChange) return;
    onSelectedChange(
      checked ? Array.from(new Set([...selectedIds, id])) : selectedIds.filter((item) => item !== id)
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {onSearchChange ? (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={searchPlaceholder}
              value={search || ''}
              onChange={(event) => onSearchChange(event.target.value)}
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}
        {filters}
        {toolbar}
      </div>

      {selectable && selectedIds.length > 0 && bulkActions?.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">{selectedIds.length} selected</span>
          {bulkActions.map((action) => (
            <Button
              key={action.id}
              size="sm"
              variant={action.destructive ? 'destructive' : 'outline'}
              onClick={() => onBulkAction?.(action.id)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}

      {error ? <ApiErrorAlert message={error} status={errorStatus} /> : null}

      {loading ? (
        <LoadingState type="table" count={6} />
      ) : rows.length === 0 && !error ? (
        <div className="rounded-lg border">
          <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable ? (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(value) => toggleAll(Boolean(value))}
                      aria-label="Select all rows"
                    />
                  </TableHead>
                ) : null}
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(column.hideOnMobile && 'hidden md:table-cell', column.className)}
                    aria-sort={
                      sortKey === column.key
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => onSort(column.key)}
                      >
                        {column.header}
                        {sortKey === column.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="size-3" />
                          ) : (
                            <ArrowDown className="size-3" />
                          )
                        ) : (
                          <ArrowUpDown className="size-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                ))}
                {rowActions ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const id = getRowId(row);
                return (
                  <TableRow key={id}>
                    {selectable ? (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(id)}
                          onCheckedChange={(value) => toggleOne(id, Boolean(value))}
                          aria-label={`Select row ${id}`}
                        />
                      </TableCell>
                    ) : null}
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={cn(column.hideOnMobile && 'hidden md:table-cell', column.className)}
                      >
                        {column.render
                          ? column.render(row)
                          : String((row as Record<string, unknown>)[column.key] ?? '')}
                      </TableCell>
                    ))}
                    {rowActions ? (
                      <TableCell className="text-right">{rowActions(row)}</TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {onPageChange && totalItems > pageSize ? (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : totalItems > 0 ? (
        <p className="text-sm text-muted-foreground">{totalItems} records</p>
      ) : null}
    </div>
  );
}
