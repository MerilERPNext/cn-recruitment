import { useState } from 'react';

// Icon Components using SVGs
const BackIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
  </svg>
);

const SearchIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
    <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"></path>
  </svg>
);

const FilterIcon = () => (
  <svg fill="currentColor" height="16" viewBox="0 0 256 256" width="16" xmlns="http://www.w3.org/2000/svg">
    <path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"></path>
  </svg>
);

const HistoryIcon = () => (
  <svg fill="currentColor" height="20" viewBox="0 0 256 256" width="20" xmlns="http://www.w3.org/2000/svg">
    <path d="M136,80v43.47l36.12,21.67a8,8,0,0,1-8.24,13.72l-40-24A8,8,0,0,1,120,128V80a8,8,0,0,1,16,0ZM128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24ZM40,128a88,88,0,1,1,88,88A88.1,88.1,0,0,1,40,128Z"></path>
  </svg>
);

const ChevronRightIcon = () => (
  <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
    <path d="m181.66,133.66-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path>
  </svg>
);

// Header Component
const Header = ({ title, onBackClick }: any) => (
  <div className="flex items-center bg-white p-4 sticky top-0 z-10 border-b border-gray-100">
    <button
      className="text-gray-800 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
      onClick={onBackClick}
    >
      <BackIcon />
    </button>
    <h1 className="text-gray-800 text-xl font-semibold leading-tight flex-1 text-center pr-10">
      {title}
    </h1>
  </div>
);

// Search Input Component
const SearchInput = ({ value, onChange, placeholder }: any) => (
  <div className="relative">
    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
      <SearchIcon />
    </div>
    <input
      className="form-input w-full rounded-xl border-gray-300 bg-gray-50 py-3 pl-10 pr-4 text-gray-800 focus:border-blue-500 focus:ring-blue-500 placeholder:text-gray-600 transition-colors"
      placeholder={placeholder}
      type="search"
      value={value}
      onChange={onChange}
    />
  </div>
);

// Filter Chip Component
const FilterChip = ({ children, isActive = false, hasIcon = false, onClick }: any) => {
  const baseClasses = "flex h-9 shrink-0 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";
  const activeClasses = isActive 
    ? "bg-indigo-100 text-gray-700 hover:bg-indigo-200 active:bg-indigo-300"
    : "bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300";

  return (
    <button 
      className={`${baseClasses} ${activeClasses} ${hasIcon ? 'gap-x-1.5' : ''}`}
      onClick={onClick}
    >
      {hasIcon && <FilterIcon />}
      <span>{children}</span>
    </button>
  );
};

// Filter Bar Component
const FilterBar = ({ activeFilter, onFilterChange }: any) => {
  const filters = [
    { id: 'all', label: 'All Filters', hasIcon: true },
    { id: 'department', label: 'Department' },
    { id: 'role', label: 'Role' },
    { id: 'location', label: 'Location' },
    { id: 'skills', label: 'Skills' }
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
      {filters.map(filter => (
        <FilterChip
          key={filter.id}
          isActive={activeFilter === filter.id}
          hasIcon={filter.hasIcon}
          onClick={() => onFilterChange(filter.id)}
        >
          {filter.label}
        </FilterChip>
      ))}
    </div>
  );
};

// Recent Search Item Component
const RecentSearchItem = ({ searchText, onClick }: any) => (
  <a 
    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
    onClick={onClick}
  >
    <HistoryIcon />
    <p className="text-gray-600 text-sm">{searchText}</p>
  </a>
);

// Recent Searches Component
const RecentSearches = ({ searches, onSearchClick }: any) => (
  <div className="px-4 pt-2 pb-2">
    <h2 className="text-gray-800 text-lg font-semibold leading-tight">Recent Searches</h2>
    <div className="mt-2 space-y-1">
      {searches.map((search: any, index: number) => (
        <RecentSearchItem
          key={index}
          searchText={search}
          onClick={() => onSearchClick(search)}
        />
      ))}
    </div>
  </div>
);

// Member Avatar Component
const MemberAvatar = ({ src, alt, size = "h-12 w-12" }: any) => (
  <img 
    alt={alt} 
    className={`aspect-square rounded-full ${size} object-cover`}
    src={src}
  />
);

// Member Card Component
const MemberCard = ({ member, onClick }: any) => (
  <div 
    className="flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
    onClick={() => onClick(member)}
  >
    <MemberAvatar 
      src={member.avatar}
      alt={member.name}
    />
    <div className="flex-grow">
      <p className="text-gray-800 text-base font-medium leading-normal">{member.name}</p>
      <p className="text-gray-600 text-sm font-normal leading-normal">{member.role}</p>
    </div>
    <button className="text-blue-500 flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-blue-50 active:bg-blue-100 transition-colors">
      <ChevronRightIcon />
    </button>
  </div>
);

// Results Section Component
const ResultsSection = ({ members, onMemberClick }: any) => (
  <>
    <div className="px-4 pt-4 pb-2 border-t border-gray-100">
      <h2 className="text-gray-800 text-lg font-semibold leading-tight">
        Results ({members.length})
      </h2>
    </div>
    <div className="divide-y divide-gray-100">
      {members.map((member:any)  => (
        <MemberCard
          key={member.id}
          member={member}
          onClick={onMemberClick}
        />
      ))}
    </div>
  </>
);

// Main App Component
const SearchMembersApp = () => {
  const [searchValue, setSearchValue] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Sample data
  const recentSearches = [
    "Product Manager in New York",
    "Software Engineer"
  ];

  const members = [
    {
      id: 1,
      name: "Ethan Harper",
      role: "Product Manager",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuA6Gp3251NS7t-ajcN1_i2A9yup2d-BfB-RSE4IHKoVLBOh5leCp-ZPpBHb8gLSCYH2omD_lTIGG0zyTzELgEgPzn8R_g74M_QtmxqO0rxVpjLUBCxo4FuwN_Sh2JpQdOHUNpsQjI3xDDHBD5HDQ8ro3KsjopFUX19Pdj5M_5s2AX5Pqng0qjvYfYA9jGR0SvwpdlSNqtgNpVovF29bROMN3rkfWuZz3Ixw5GwVtnAbfqLKBoMJcFx1xdVAJl72AHRkDolbRbIq2taQ"
    },
    {
      id: 2,
      name: "Olivia Bennett",
      role: "Software Engineer",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6uyLqhbuQNu8gKXahKCv478KKWGpddGTR6itsLHtZ9aER2O75bkATPuFP2ZHC8Iu3G6o6p6hU_NIQdKGMaCIWaHm02fViSaNRjYWpK7cLQbdvg_ngJevP8OShGaWKnBXXwgC3ETkkhTCYusaz3tn5TmLDpuvSKvAUQL_9U-m1o3gvKETdcsmOv-8u-oF7_N962lrWKy9pAgHuww1T5qotAKZvvVU1np-6rdUYZh-PqucfKUpiNqHzw772sKxr-RD4lFhN42dh809x"
    },
    {
      id: 3,
      name: "Noah Carter",
      role: "UX Designer",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDY0XNX7TJ0ygFmUJeA2OA886jzlLGQjg4XNJ9yOhmyUo5uo_LxLb7kszu7-xf6Zy8LSt94xBt9kHgQBVv7n0RV77uoL9czpyp8COBs4yVs0gt9pNFtg5mYXecUEG-My_4jSzYDGwJmvJlj4r8XGE4iub6X6vqPmWX2LeYwj2oABNGoFuoOZjkm0by10U0xQJAsEpej4rbbq_Ay_jCqFnP8zzYXvMc4Klh_5gMd1HGHCIvSCmuzxIBOjaO49foiL-Ntm_jRk2FSm3o6"
    },
    {
      id: 4,
      name: "Ava Mitchell",
      role: "Data Analyst",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuArqpf_yx8q-Is9Ro_WuhSZJV13GtU02-HLkb0RSvEh-StLWuDmaQJ0EVzOBLWCkkpi1AjYDadMS49u2c7kI1i0WARm4ZHzM5PWJC_sB2mOJLqD4-hWJR1qEw24QbvyV20d9EqlLdCxTE5vXXXEa58GKBvNlvpmuLD6B5T_Hpjk0xCX3YTeq18-kABRIOxtU1GrjrwyxmMktWg5eL_ndq6ycOPw6X5JfF_rjWk-WG5DL5DeU1lR21Fnos5V-C6GNmvat1JfEfa2-qTa"
    },
    {
      id: 5,
      name: "Liam Foster",
      role: "Marketing Specialist",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDo-0RYkkV-XfczAuBgbFVjy4j2zcaY8ra_bjH93mdKbfZLsfPajon6B9nbXH3OqJuLjyiqAcIIw7w3a3IUcR0dQdQJCC-uTgCoEijWg5vPzC_S4L8cAkvkOThCaXULeeGEaiNaimsNS47G1rcr1Y6lBnRYFTDzYa4xp6_fX8zw88nJvM4h6Xb2ZgK0BjxYW1Uv89dc1wnIIPye1fWGYQuaRUEkudbobSxr2pxFJtTVFEj95K4gJocOrY1JIfiWjVZUe4bUzl61JMOz"
    }
  ];

  // Event handlers
  const handleBackClick = () => {
    console.log('Back button clicked');
    // Handle navigation back
  };

  const handleSearchChange = (e: any) => {
    setSearchValue(e.target.value);
    console.log('Search value:', e.target.value);
  };

  const handleFilterChange = (filterId: any) => {
    setActiveFilter(filterId);
    console.log('Filter changed to:', filterId);
  };

  const handleRecentSearchClick = (searchText: any) => {
    setSearchValue(searchText);
    console.log('Recent search clicked:', searchText);
  };

  const handleMemberClick = (member: any) => {
    console.log('Member clicked:', member);
    // Handle member selection/navigation
  };

  return (
    <div 
      className="relative flex size-full min-h-screen flex-col justify-between bg-white overflow-x-hidden"
      style={{ 
        fontFamily: 'Inter, "Noto Sans", sans-serif',
        minHeight: 'max(884px, 100dvh)'
      }}
    >
      <div className="flex-grow">
        <Header 
          title="Search Members"
          onBackClick={handleBackClick}
        />
        
        <div className="p-4 space-y-4">
          <SearchInput
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search by name, role, skill..."
          />
          
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
          />
        </div>
        
        <RecentSearches
          searches={recentSearches}
          onSearchClick={handleRecentSearchClick}
        />
        
        <ResultsSection
          members={members}
          onMemberClick={handleMemberClick}
        />
      </div>
    </div>
  );
};

export default SearchMembersApp;