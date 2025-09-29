import HeaderBar from "./HeaderBar";
import SearchCard from "./Employee/SearchCard";
import { useNavigate } from "react-router-dom";
import {  useEmployees } from "../hooks/useEmployee";
import { useEffect, useState } from "react";
import useDebounce from "../hooks/useDebounce";
import { Employee } from "../types/employee";
import DesktopLayoutWrapper from "./DesktopLayoutWrapper";

const SearchMembersApp = () => {
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
    ]
  );

  const navigate = useNavigate();

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
        <div className="flex flex-col items-center py-10 text-gray-500">
          <div className="h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="mt-3 text-sm">Loading…</span>
        </div>
      );

    if (error)
      return (
        <div className="text-center text-red-600 py-6" role="alert">
          Error loading employees
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
      <SearchCard
        employees={employees}
        
        onRemove={removeItemsFromLocal}
      />
    ) : (
      <div className="text-center text-gray-500 py-6">No employees found</div>
    );
  };

  return (
    <DesktopLayoutWrapper title="Search Members">
      <div className="min-h-screen bg-white flex flex-col">
        <HeaderBar title="Search Members" onBack={() => navigate(-1)} />

        <main className="flex-grow w-full">
          <div className="mx-auto min-w-3xl px-3 py-4 sm:px-6 lg:px-8 sm:py-6">
            <input
              id="member-search"
              type="text"
              value={searchQuery}
              onChange={onSearchInputChange}
              placeholder="Search members…"
              className="w-full h-11 sm:h-12 rounded-lg border border-gray-300 bg-gray-50 px-3 sm:px-4 text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              inputMode="search"
              autoComplete="off"
            />

            <div className="mt-4 sm:mt-6 ">{employeeList()}</div>
          </div>
        </main>
      </div>
    </DesktopLayoutWrapper>
  );
};

export default SearchMembersApp;
