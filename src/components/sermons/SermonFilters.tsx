interface FilterOption {
  label: string;
  value: string;
}

interface SermonFiltersProps {
  action?: string;
  search?: string;
  speaker?: string;
  series?: string;
  category?: string;
  from?: string;
  to?: string;
  sort?: string;
  speakers?: FilterOption[];
  seriesOptions?: FilterOption[];
  categories?: FilterOption[];
}

export function SermonFilters({
  action = '/sermons',
  search = '',
  speaker = '',
  series = '',
  category = '',
  from = '',
  to = '',
  sort = 'newest',
  speakers = [],
  seriesOptions = [],
  categories = [],
}: SermonFiltersProps) {
  return (
    <form className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4" action={action} method="get">
      <div className="sm:col-span-2 lg:col-span-4">
        <label className="mb-1 block text-sm font-medium" htmlFor="sermon-search">
          Search sermons
        </label>
        <input
          id="sermon-search"
          name="q"
          defaultValue={search}
          placeholder="Search by title, speaker, series, or scripture"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="sermon-speaker">
          Speaker
        </label>
        <select
          id="sermon-speaker"
          name="speaker"
          defaultValue={speaker}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All speakers</option>
          {speakers.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="sermon-series">
          Series
        </label>
        <select
          id="sermon-series"
          name="series"
          defaultValue={series}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All series</option>
          {seriesOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="sermon-category">
          Category
        </label>
        <select
          id="sermon-category"
          name="category"
          defaultValue={category}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="sermon-sort">
          Sort
        </label>
        <select
          id="sermon-sort"
          name="sort"
          defaultValue={sort}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="sermon-from">
          From date
        </label>
        <input
          id="sermon-from"
          name="from"
          type="date"
          defaultValue={from}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="sermon-to">
          To date
        </label>
        <input
          id="sermon-to"
          name="to"
          type="date"
          defaultValue={to}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <div className="flex items-end">
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Apply filters
        </button>
      </div>
    </form>
  );
}
