import { JSX, useCallback, useMemo, useState } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import { ArrowLeft, Search, X, UserX } from "lucide-react";
import Button from "../../../shared/atoms/Button";
import { useLinkFieldOptions } from "../../../../hooks/useLinkFieldOptions";
import useDebounce from "../../../../hooks/useDebounce";
import { ErrorState, EmployeeListSkeleton } from "./TeamTrackingStates";
import { EmployeeGoalsList } from "./EmployeeGoalsList";
import { EmployeeCard } from "./EmployeeCard";

type ViewState = "employees" | "goals";

export interface TeamTrackingViewProps {
  title?: string;
  showHeader?: boolean;
  className?: string;
}

export const TeamTrackingView = ({
  title = "Team Tracking",
  showHeader = true,
  className = "",
}: TeamTrackingViewProps): JSX.Element => {
  const [viewState, setViewState] = useState<ViewState>("employees");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    data: employeeData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isEmployeesLoading,
    isError: isEmployeesError,
    error: employeesError,
    refetch: refetchEmployees,
  } = useLinkFieldOptions({
    doctype: "Employee",
    searchText: debouncedSearchQuery,
    filters: { status: "Active" },
  });

  const employeeList = useMemo(
    () => employeeData?.pages?.flatMap((page) => page?.results || []) || [],
    [employeeData]
  );

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employeeList;
    const q = searchQuery.toLowerCase().trim();
    return employeeList.filter(
      (emp: { id?: string; label?: string }) =>
        (emp.label && emp.label.toLowerCase().includes(q)) ||
        (emp.id && emp.id.toLowerCase().includes(q))
    );
  }, [employeeList, searchQuery]);

  const selectedEmployee = useMemo(
    () => employeeList.find((e: { id: string }) => e.id === selectedEmployeeId),
    [employeeList, selectedEmployeeId]
  );

  const handleSelectEmployee = useCallback((id: string) => {
    setSelectedEmployeeId(id);
    setViewState("goals");
  }, []);

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      {showHeader && (
        <div className="flex items-center px-3.5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          {viewState !== "employees" && (
            <button
              onClick={() => {
                setViewState("employees");
                setSelectedEmployeeId(null);
              }}
              className="mr-2 sm:mr-3 p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors flex items-center justify-center"
              aria-label="Back to employee list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <Typography variant="h4" className="font-semibold text-gray-900 text-base sm:text-lg">
              {viewState === "employees"
                ? (title || "Team Tracking")
                : `Goals for ${selectedEmployee?.label || "Employee"}`}
            </Typography>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#f8fafc]">
        {viewState === "employees" ? (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee by name or ID..."
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isEmployeesLoading ? (
              <EmployeeListSkeleton />
            ) : isEmployeesError ? (
              <ErrorState
                message={employeesError?.message}
                onRetry={refetchEmployees}
              />
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 p-6 shadow-xs">
                <UserX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <Typography variant="h3" className="text-gray-700 font-medium mb-1 text-base">
                  No employees found
                </Typography>
                <Typography variant="body" className="text-gray-400 text-sm">
                  No employee matching "{searchQuery}" was found.
                </Typography>
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery("")}
                  className="mt-4 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEmployees.map((emp) => (
                  <EmployeeCard
                    key={emp.id}
                    emp={emp}
                    onSelect={handleSelectEmployee}
                  />
                ))}

                {hasNextPage && !searchQuery && (
                  <div className="flex justify-center pt-4 pb-2">
                    <Button
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                      variant="outline"
                      className="text-sm font-medium border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 flex items-center gap-2 px-6 py-2 rounded-lg"
                    >
                      {isFetchingNextPage ? (
                        <>
                          <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Loading more employees...
                        </>
                      ) : (
                        "Load More Employees"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <EmployeeGoalsList employeeId={selectedEmployeeId || ""} />
        )}
      </div>
    </div>
  );
};
