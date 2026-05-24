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
    <div className="p-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center">
      <div className="flex-1 w-full flex border border-gray-200 rounded-lg overflow-hidden h-10 items-center focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all bg-white">
        <div className="pl-3 pr-2 text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input 
          aria-label="Search peer nominees"
          type="text" 
          placeholder="Search PW employees by name, team or BU..." 
          className="flex-1 h-full outline-none text-sm text-gray-900 placeholder:text-gray-400 bg-transparent w-full"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex gap-3 w-full sm:w-auto">
        <div className="w-[140px] shrink-0">
          <Select 
            options={[{label: "India Tech BU", value: "india_tech"}]} 
            value={{label: "India Tech BU", value: "india_tech"}} 
            onChange={()=>{}} 
            className="!w-full [&>button]:h-10 [&>button]:py-0 [&>button]:shadow-none"
          />
        </div>
        <Button 
          variant="soft" 
          className="whitespace-nowrap text-purple-700 bg-purple-50 hover:bg-purple-100 h-10 px-4" 
          icon={<Sparkles className="w-4 h-4 text-purple-500" />}
        >
          AI suggestions ({aiSuggestionCount})
        </Button>
      </div>
    </div>
  );
};
