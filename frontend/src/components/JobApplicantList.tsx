import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  MoreHorizontal,
  Plus,
  Share,
  ChevronDown,
  ChevronRight,
  ListChecks,
} from "lucide-react";

// Types
interface JobApplicant {
  id: number;
  name: string;
  role: string;
  appliedDate: string;
  profileImage?: string;
  email: string;
  status: string;
  phone?: string;
  skills?: string[];
  location?: string;
  source?: string;
  resumeUrl?: string;
}

interface FilterOption {
  id: string;
  label: string;
  active?: boolean;
  hasDropdown?: boolean;
}

const filterOptions: FilterOption[] = [
  { id: "all", label: "All Applicants", active: true },
  { id: "job", label: "Job", hasDropdown: true },
  { id: "status", label: "Status", hasDropdown: true },
  { id: "source", label: "Source", hasDropdown: true },
  { id: "date", label: "Date", hasDropdown: true },
  { id: "location", label: "Location", hasDropdown: true },
];

// Mock data for demo purposes
const mockApplicants: JobApplicant[] = [
  {
    id: 1,
    name: "Ethan Harper",
    role: "Software Engineer",
    appliedDate: "2d ago",
    profileImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    email: "ethan.harper@example.com",
    status: "pending",
    phone: "+1-234-567-8900",
    location: "San Francisco, CA",
    source: "LinkedIn",
  },
  {
    id: 2,
    name: "Noah Carter",
    role: "Data Analyst",
    appliedDate: "1w ago",
    profileImage:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    email: "noah.carter@example.com",
    status: "interviewed",
    phone: "+1-234-567-8902",
    location: "Austin, TX",
    source: "Referral",
  },
  {
    id: 3,
    name: "Ava Mitchell",
    role: "UX Designer",
    appliedDate: "2w ago",
    profileImage:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    email: "ava.mitchell@example.com",
    status: "pending",
    phone: "+1-234-567-8903",
    location: "Seattle, WA",
    source: "LinkedIn",
  },
  {
    id: 4,
    name: "Liam Foster",
    role: "Marketing Specialist",
    appliedDate: "3w ago",
    profileImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    email: "liam.foster@example.com",
    status: "hired",
    phone: "+1-234-567-8904",
    location: "Los Angeles, CA",
    source: "Company Website",
  },
];

const Header = () => {
  const handleBack = () => {
    console.log("Back button clicked");
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm">
      <div className="flex items-center p-4">
        <button
          onClick={handleBack}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-xl font-bold tracking-tight text-slate-900 pr-10">
          Job Applicants
        </h1>
      </div>
    </header>
  );
};

const SearchBar = ({
  searchTerm,
  setSearchTerm,
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="py-3 sticky top-[72px] bg-slate-50 z-10">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full rounded-full border-none bg-slate-100 py-3 pl-12 pr-4 text-base placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 transition-all outline-none"
          placeholder="Search by name, email, phone, skills"
        />
      </div>
    </div>
  );
};

const FilterChips = ({
  filters,
  activeFilter,
  setActiveFilter,
}: {
  filters: FilterOption[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}) => {
  const handleFilterClick = (filterId: string) => {
    if (filterId === "all") {
      setActiveFilter(filterId);
    } else {
      console.log("Filter dropdown clicked:", filterId);
    }
  };

  return (
    <div className="flex gap-2 py-3 overflow-x-auto whitespace-nowrap -mx-4 px-4">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => handleFilterClick(filter.id)}
          className={`flex h-10 items-center justify-center gap-x-1 rounded-full px-4 border transition-colors duration-200 hover:bg-gray-50 ${
            filter.active && activeFilter === filter.id
              ? "bg-blue-100 border-blue-100 text-blue-700"
              : "bg-white border-gray-200 text-gray-700"
          }`}
        >
          <span
            className={`text-sm ${
              filter.active && activeFilter === filter.id
                ? "font-semibold"
                : "font-medium"
            }`}
          >
            {filter.label}
          </span>
          {filter.hasDropdown && (
            <ChevronDown
              className={`h-4 w-4 ${
                filter.active && activeFilter === filter.id
                  ? "text-blue-700"
                  : "text-gray-500"
              }`}
            />
          )}
        </button>
      ))}
    </div>
  );
};

const Avatar = ({ src, name }: { src?: string; name: string }) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-gray-600 text-sm font-medium">
          {getInitials(name)}
        </span>
      )}
    </div>
  );
};

const ApplicantCard = ({
  applicant,
  isLast,
}: {
  applicant: JobApplicant;
  isLast: boolean;
}) => {
  const handleCardClick = () => {
    console.log("Applicant clicked:", applicant.name);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`flex items-center gap-4 bg-white px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
        !isLast ? "border-b border-gray-100" : ""
      }`}
    >
      <Avatar src={applicant.profileImage} name={applicant.name} />

      <div className="flex-grow">
        <p className="font-semibold text-base text-slate-900">
          {applicant.name}
        </p>
        <p className="text-sm text-slate-500">
          {applicant.role} | Applied {applicant.appliedDate}
        </p>
      </div>

      <ChevronRight className="h-5 w-5 text-gray-400" />
    </div>
  );
};

const ApplicantsList = ({
  applicants,
  searchTerm,
}: {
  applicants: JobApplicant[];
  searchTerm: string;
}) => {
  const filteredApplicants = applicants.filter(
    (applicant) =>
      applicant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = () => {
    console.log("Export button clicked");
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">
          Showing {filteredApplicants.length} applicants
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <span>Export</span>
          <Share className="h-4 w-4" />
        </button>
      </div>

      <div className="-mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        {filteredApplicants.map((applicant, index) => (
          <ApplicantCard
            key={applicant.id}
            applicant={applicant}
            isLast={index === filteredApplicants.length - 1}
          />
        ))}

        {filteredApplicants.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500">
            No applicants found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

const BottomActionBar = () => {
  const handleFilters = () => {
    console.log("Filters button clicked");
  };

  const handleBulkActions = () => {
    console.log("Bulk Actions button clicked");
  };

  const handleAdd = () => {
    console.log("Add button clicked");
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-gray-100 z-10">
      <div className="flex justify-between items-center">
        <button
          onClick={handleFilters}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors"
        >
          <Filter className="h-5 w-5" />
          <span>Filters</span>
        </button>

        <button
          onClick={handleBulkActions}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition-colors"
        >
          <ListChecks className="h-6 w-6" />
          <span>Bulk Actions</span>
        </button>

        <button
          onClick={handleAdd}
          className="flex items-center justify-center size-12 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </footer>
  );
};

export default function JobApplicantList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [filters, setFilters] = useState(filterOptions);

  useEffect(() => {
    setApplicants(mockApplicants);
  }, []);

  return (
    <div className="relative flex size-full min-h-screen flex-col justify-between overflow-x-hidden bg-slate-50">
      <div className="flex flex-col">
        <Header />
        <main className="flex-grow px-4 pb-24">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <FilterChips
            filters={filters}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
          />
          <ApplicantsList applicants={applicants} searchTerm={searchTerm} />
        </main>
      </div>
      <BottomActionBar />
    </div>
  );
}
