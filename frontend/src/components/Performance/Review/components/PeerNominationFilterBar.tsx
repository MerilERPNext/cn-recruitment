import React from 'react';
import { Search } from 'lucide-react';
import CustomDropdown from '../../../shared/CustomDropdown';

interface PeerNominationFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedBu: string;
  onBuChange: (value: string) => void;
  aiSuggestionCount?: number;
}

const BU_OPTIONS = [
  { label: "All BUs", value: "all" },
  { label: "India Tech BU", value: "india_tech" },
  { label: "US Tech BU", value: "us_tech" },
  { label: "UK Tech BU", value: "uk_tech" },
];

export const PeerNominationFilterBar: React.FC<PeerNominationFilterBarProps> = ({ 
  searchTerm, 
  onSearchChange,
  selectedBu,
  onBuChange,
}) => {
  return (
    <div className="flex min-w-0 flex-col gap-3 border-b border-gray-100 bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex h-10 w-full min-w-0 flex-1 items-center overflow-hidden rounded-lg border border-gray-200 bg-white transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        <div className="pl-3 pr-2 text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input 
          aria-label="Search peer nominees"
          type="text" 
          placeholder="Search employees" 
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:flex sm:w-auto">
        <CustomDropdown
          value={selectedBu}
          onChange={(e) => onBuChange(e.target.value)}
          options={BU_OPTIONS}
          label="Filter BU"
          position="bottom-left"
          contentAlign="start"
          className="w-full sm:w-auto"
          menuClassName="!min-w-[140px] text-sm"
        />
      </div>
    </div>
  );
};
