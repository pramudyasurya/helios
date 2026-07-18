import { Search, X } from "lucide-react";
import { useEffect, useState, useRef, memo, type RefObject } from "react";

type RunSearchBarProps = {
  initialQuery?: string;
  initialStatus?: string;
  onSearch: (query: string) => void;
  onStatusChange: (status: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
};

export const RunSearchBar = memo(function RunSearchBar({
  initialQuery = "",
  initialStatus = "All",
  onSearch,
  onStatusChange,
  searchInputRef,
}: RunSearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  const lastQueryRef = useRef(initialQuery);

  const handleClear = () => {
    setQuery("");
    lastQueryRef.current = "";
    onSearch("");
  };

  useEffect(() => {
    if (query === lastQueryRef.current) return;

    const timeoutId = setTimeout(() => {
      lastQueryRef.current = query;
      onSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-4 w-4 text-muted" aria-hidden="true" />
        </div>

        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full rounded-md border border-border bg-background py-2 pl-9 pr-10 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          placeholder="Search by URL or title..."
          aria-label="Search runs"
          aria-keyshortcuts="Alt+S"
          aria-describedby="run-search-shortcut"
        />
        <span id="run-search-shortcut" className="sr-only">
          Press Alt + S to focus search.
        </span>
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="sm:w-48">
        <select
          value={initialStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="block w-full rounded-md border border-border bg-background py-2 pl-3 pr-10 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          aria-label="Filter by status"
        >
          <option value="All">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="Failed">Failed</option>
        </select>
      </div>
    </div>
  );
});
