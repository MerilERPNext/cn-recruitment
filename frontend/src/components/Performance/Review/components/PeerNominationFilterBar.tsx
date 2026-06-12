import React from 'react';
import { Search, Sparkles } from 'lucide-react';
import Button from '../../../shared/atoms/Button';
import { Select } from '../../../shared/atoms/Select';

interface PeerNominationFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  aiSuggestionCount?: number;
}

export const PeerNominationFilterBar: React.FC<PeerNominationFilterBarProps> = ({ 
  searchTerm, 
  onSearchChange,
  aiSuggestionCount = 8
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
        <div className="min-w-0 sm:w-[140px] sm:shrink-0">
          <Select 
            options={[{label: "India Tech BU", value: "india_tech"}]} 
            value={{label: "India Tech BU", value: "india_tech"}} 
            onChange={()=>{}} 
            className="!w-full [&>button]:h-10 [&>button]:py-0 [&>button]:shadow-none"
          />
        </div>
        <Button 
          variant="soft" 
          className="h-10 w-full justify-center bg-purple-50 px-3 text-purple-700 hover:bg-purple-100 sm:w-auto sm:whitespace-nowrap sm:px-4" 
          icon={<Sparkles className="w-4 h-4 text-purple-500" />}
        >
          AI suggestions<span className="hidden min-[360px]:inline"> ({aiSuggestionCount})</span>
        </Button>
      </div>
    </div>
  );
};
