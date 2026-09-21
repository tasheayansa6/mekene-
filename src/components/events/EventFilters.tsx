interface FilterOption {
  label: string;
  value: string;
}

interface EventFiltersProps {
  action?: string;
  search?: string;
  category?: string;
  ministry?: string;
  location?: string;
  online?: string;
  from?: string;
  to?: string;
  sort?: string;
  categories?: FilterOption[];
  ministries?: FilterOption[];
  locations?: FilterOption[];
}

export function EventFilters({
  action = '/events',
  search = '',
  category = '',
  ministry = '',
  location = '',
  online = '',
  from = '',
  to = '',
  sort = 'soonest',
  categories = [],
  ministries = [],
  locations = [],
}: EventFiltersProps) {
  return (
    <form
      className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4"
      action={action}
      method="get"
    >
      <div className="sm:col-span-2 lg:col-span-4">
        <label className="mb-1 block text-sm font-medium" htmlFor="event-search">
          Search events
        </label>
        <input
          id="event-search"
          name="q"
          defaultValue={search}
          placeholder="Search by title, ministry, organizer, or location"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="event-category">
          Category
        </label>
        <select
          id="event-category"
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
        <label className="mb-1 block text-sm font-medium" htmlFor="event-ministry">
          Ministry
        </label>
        <select
          id="event-ministry"
          name="ministry"
          defaultValue={ministry}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All ministries</option>
          {ministries.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="event-location">
          Location
        </label>
        <select
          id="event-location"
          name="location"
          defaultValue={location}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All locations</option>
          {locations.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="event-online">
          Format
        </label>
        <select
          id="event-online"
          name="online"
          defaultValue={online}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="">In-person and online</option>
          <option value="false">In-person</option>
          <option value="true">Online</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="event-from">
          From date
        </label>
        <input
          id="event-from"
          name="from"
          type="date"
          defaultValue={from}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="event-to">
          To date
        </label>
        <input
          id="event-to"
          name="to"
          type="date"
          defaultValue={to}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="event-sort">
          Sort
        </label>
        <select
          id="event-sort"
          name="sort"
          defaultValue={sort}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        >
          <option value="soonest">Soonest</option>
          <option value="latest">Latest</option>
          <option value="newest">Newest published</option>
        </select>
      </div>
      <div className="flex items-end">
        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Apply filters
        </button>
      </div>
    </form>
  );
}
