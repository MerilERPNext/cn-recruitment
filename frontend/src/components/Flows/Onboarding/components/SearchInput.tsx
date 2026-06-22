import { memo } from "react";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchInput = ({ value, onChange }: SearchInputProps) => (
  <div className="relative min-w-0 flex-1 max-w-full">
    <Search
      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      size={16}
    />
    <input
      type="text"
      placeholder="Search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800"
    />
  </div>
);

export default memo(SearchInput);
