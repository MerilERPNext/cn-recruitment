import { useEffect, useState } from "react";

import { Search } from "lucide-react";

import useDebounce from "../../hooks/useDebounce";
import { useEmployees } from "../../hooks/useEmployee";
import SearchCard from "../Employee/SearchCard";
import { Employee } from "../../types/employee";

const EmployeeCardSkeleton = () => {
  return (
    <div className="w-full animate-pulse">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 sm:px-5 sm:py-4 shadow-sm">
        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex flex-col min-w-0 w-full gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="h-4 sm:h-5 bg-gray-200 rounded w-3/4 sm:w-1/2" />
            <div className="h-4 sm:h-5 bg-gray-200 rounded w-16 sm:w-20" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 text-sm text-gray-600 mt-1">
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-32 sm:w-40" />
            <span className="sm:mx-3 mx-1 hidden sm:block text-gray-300">
              •
            </span>
            <div className="h-3 sm:h-4 bg-gray-200 rounded w-24 sm:w-32" />
          </div>
        </div>
        <div className="h-6 w-6 sm:h-7 sm:w-7 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
};

const SearchMembers = () => {
  const [recentSearches, setRecentSearches] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const query = useDebounce(searchQuery, 350);

  const {
    data: employees,
    isLoading,
    error,
  } = useEmployees(
    ["employee_name", "image", "status", "department", "designation", "name"],
    [],
    [
      ["name", "like", `%${query}%`],
      ["employee_name", "like", `%${query}%`],
      ["status", "like", `%${query}%`],
      ["department", "like", `%${query}%`],
      ["designation", "like", `%${query}%`],
      ["name", "like", `%${query}%`],
    ]
  );

  // Load recent searches
  useEffect(() => {
    const stored: Employee[] = JSON.parse(
      localStorage.getItem("recentSearches") || "[]"
    );

    if (!searchQuery) {
      setRecentSearches(stored);
    } else {
      const filtered = stored.filter((emp) =>
        emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setRecentSearches(filtered);
    }
  }, [searchQuery]);

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const removeItemsFromLocal = (idx: number) => {
    const updated = [...recentSearches];
    updated.splice(idx, 1);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
    setRecentSearches(updated);
  };

  const employeeList = () => {
    if (isLoading)
      return (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <EmployeeCardSkeleton key={i} />
          ))}
        </div>
      );

    if (error)
      return (
        <div className="text-center text-red-600 py-6" role="alert">
          {error.message.toString()}
        </div>
      );

    if (!searchQuery.trim()) {
      return recentSearches.length > 0 ? (
        <SearchCard
          employees={recentSearches}
          onRemove={removeItemsFromLocal}
          showRemove
        />
      ) : (
        <div className="text-center text-gray-500 py-6">No recent searches</div>
      );
    }

    return employees && employees.length > 0 ? (
      <SearchCard employees={employees} onRemove={removeItemsFromLocal} />
    ) : (
      <div className="text-center text-gray-500 py-6">No employees found</div>
    );
  };

  const [isFocused, setIsFocused] = useState(false);

  return (
    // <div className="w-full max-w-md flex flex-col">
    <div className="w-full max-w-md min-w-0 flex flex-col">
      <main className="flex-grow w-full">
        <div className="relative mx-auto max-w-3xl px-3 sm:px-6 lg:px-8 ">
          <div className="flex items-center gap-2">
            <div className="flex-1  flex  bg-gray-100 focus-within:bg-white items-center gap-2 rounded-xl  px-3 sm:px-4 h-11 sm:h-12 focus-within:ring-2 ring-blue-700 transition">
              <Search className="text-gray-600 w-5 h-5" aria-hidden="true" />
              <input
                id="member-search"
                type="search"
                value={searchQuery}
                onChange={onSearchInputChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="Search members…"
                className="flex-1 min-w-0 bg-transparent text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none"
                inputMode="search"
                autoComplete="off"
              />
            </div>
          </div>
          {isFocused && (
            <div className="absolute sm:top-[60%] top-[120%] left-1/2 -translate-x-1/2 rounded-lg overflow-hidden border-gray-200 shadow-lg border bg-gray-50 py-2 overflow-y-auto max-w-[90%] max-h-[200px]  w-full  sm:mt-6">
              {employeeList()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchMembers;
