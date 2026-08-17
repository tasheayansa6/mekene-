'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface SermonFiltersProps {
  defaultValues?: {
    search?: string;
    category?: string;
    sort?: string;
  };
}

const categories: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Sunday Sermon', value: 'Sunday Sermon' },
  { label: 'Bible Study', value: 'Bible Study' },
  { label: 'Feast Day', value: 'Feast Day' },
  { label: 'Special Event', value: 'Special Event' },
];

const sortOptions: { label: string; value: string }[] = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
];

export function SermonFilters({ defaultValues }: SermonFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all' || value === 'newest' || value === '') {
        params.delete(name);
      } else {
        params.set(name, value);
      }
      return params.toString();
    },
    [searchParams]
  );

  const currentSearch = defaultValues?.search || searchParams.get('search') || '';
  const currentCategory = defaultValues?.category || searchParams.get('category') || 'all';
  const currentSort = defaultValues?.sort || searchParams.get('sort') || 'newest';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search sermons..."
          defaultValue={currentSearch}
          className="pl-9"
          onChange={(e) => {
            const qs = createQueryString('search', e.target.value);
            router.push(qs ? `${pathname}?${qs}` : pathname);
          }}
        />
      </div>

      {/* Category filter */}
      <Select
        defaultValue={currentCategory}
        onValueChange={(value) => {
          const qs = createQueryString('category', value);
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.value} value={cat.value}>
              {cat.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        defaultValue={currentSort}
        onValueChange={(value) => {
          const qs = createQueryString('sort', value);
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}