import { memo } from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchInput = ({ value, onChange }: SearchInputProps) => (
  <div className="relative min-w-0 flex-1 max-w-full">
    <Search
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-body2"
      size={16}
    />
    <input
      type="text"
      placeholder="Search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm bg-gray-50/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-disabled text-text-title"
    />
  </div>
);

export default memo(SearchInput);
