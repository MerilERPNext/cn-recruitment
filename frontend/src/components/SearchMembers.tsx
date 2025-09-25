import HeaderBar from "./HeaderBar";
import SearchCard from "./Employee/SearchCard";
import { useNavigate } from "react-router-dom";
import { useGetAllEmployees } from "../hooks/useEmployee";
import { useEffect, useState } from "react";
import useDebounce from "../hooks/useDebounce";
import { Employee } from "../types/employee";

const SearchMembersApp = () => {
  const [getRecentSearch, setgetRecentSearch] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  const query = useDebounce(searchQuery, 350);
  const {
    data: employees,
    isLoading,
    error,
  } = useGetAllEmployees(
    ["employee_name", "image", "status", "department", "designation", "name"],
    [],
    [
      ["name", "like", `%${query}%`],
      ["employee_name", "like", `%${query}%`],
    ]
  );
  const navigate = useNavigate();

  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (employees) {
      setAllEmployees(employees as Employee[]);
    }
  }, [employees]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredEmployees(allEmployees);
      const stored: Employee[] = JSON.parse(
        localStorage.getItem("recentSearches") || "[]"
      );
      setgetRecentSearch(stored);
      return;
    }

    const filtered = allEmployees.filter((emp) =>
      emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredEmployees(filtered);

    const stored: Employee[] = JSON.parse(
      localStorage.getItem("recentSearches") || "[]"
    );
    const recentFiltered = stored.filter((emp) =>
      emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setgetRecentSearch(recentFiltered);
  }, [searchQuery, allEmployees]);

  function loadingState() {
    if (!isLoading) return null;
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-500">
        <div className="h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="mt-3 text-sm">Loading…</span>
      </div>
    );
  }

  function errorState() {
    return (
      <div className="text-center text-red-600 py-6" role="alert">
        Error loading employees
      </div>
    );
  }

  const onSearchInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    try {
      const value = e.target.value; // do not trim while typing; keep spaces the user enters
      setSearchQuery(value);
    } catch (error) {
      console.error("Error handling search input:", error);
    }
  };

  function removeItemsFromLocal(idx: number): void {
    const removeItem = [...getRecentSearch];
    removeItem.splice(idx, 1);
    localStorage.setItem("recentSearches", JSON.stringify(removeItem));
    setgetRecentSearch(removeItem);
  }

  function onSearchQueryInputClick(): void {
    navigate("/webapp/search-members");
  }

  function employeeList() {
    if (isLoading) return loadingState();
    if (error) return errorState();

    if (!searchQuery.trim()) {
      if (getRecentSearch.length > 0) {
        return (
          <SearchCard
            employees={getRecentSearch}
            setSearchQuery={setSearchQuery}
            onRemove={removeItemsFromLocal}
            showRemove={true}
          />
        );
      } else {
        return (
          <div className="text-center text-gray-500 py-6">
            No recent searches
          </div>
        );
      }
    }

    if (filteredEmployees.length > 0) {
      return (
        <SearchCard
          onRemove={removeItemsFromLocal}
          employees={filteredEmployees}
          setSearchQuery={setSearchQuery}
        />
      );
    }

    return (
      <div className="text-center text-gray-500 py-6">No employees found</div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderBar title="Search Members" onBack={() => navigate(-1)} />

      <main className="flex-grow w-full">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Search input */}
          <label htmlFor="member-search" className="sr-only">
            Search members
          </label>
          <div className="relative w-full">
            <input
              id="member-search"
              type="text"
              value={searchQuery}
              onChange={onSearchInputChange}
              placeholder="Search members…"
              onClick={onSearchQueryInputClick}
              className="w-full h-11 sm:h-12 rounded-lg border border-gray-300 bg-gray-50 px-3 sm:px-4 text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              inputMode="search"
              autoComplete="off"
            />
          </div>

          {/* Results */}
          <div className="mt-4 sm:mt-6">{employeeList()}</div>
        </div>
      </main>
    </div>
  );
};

export default SearchMembersApp;
