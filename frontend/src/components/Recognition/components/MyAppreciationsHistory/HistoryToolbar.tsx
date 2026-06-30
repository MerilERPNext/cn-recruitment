import { ExternalLink, Filter, Search } from "lucide-react";

type HistoryToolbarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFilterClick?: () => void;
};

const HistoryToolbar = ({
  searchTerm,
  onSearchChange,
  onFilterClick,
}: HistoryToolbarProps) => (
  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <input
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search Employees"
        className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm font-medium text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </div>

    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onFilterClick}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
        aria-label="Filter appreciations"
      >
        <Filter className="h-4 w-4" />
      </button>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50"
        aria-label="Open export options"
      >
        <ExternalLink className="h-4 w-4" />
      </button>
    </div>
  </div>
);

export default HistoryToolbar;
