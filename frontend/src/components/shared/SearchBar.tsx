import React from "react";
import { Search } from "lucide-react";

interface SearchInputWrapperProps {
  searchTerm: string;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string; // optional wrapper styling
}

const SearchInputWrapper: React.FC<SearchInputWrapperProps> = ({
  searchTerm,
  handleSearch,
  className = "",
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Search..."
          className="w-full h-12 pl-10 pr-3 text-sm bg-transparent placeholder-gray-400 outline-none border-none focus:outline-none"
        />
      </div>
    </div>
  );
};

export default SearchInputWrapper;