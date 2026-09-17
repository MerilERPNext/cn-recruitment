import React, { useState, useMemo } from "react";
import { Search, ShieldCheck, UserCheck, Users, X } from "lucide-react";

import {
  useInfiniteAllActiveEmployees,
  useInfiniteActiveReportees,
} from "../../../../../hooks/usePip";
import useDebounce from "../../../../../hooks/useDebounce";
import type { ActiveRepotreeTypes } from "../../../../../services/pipService";

import { Typography } from "../../../../shared/atoms/Typography";
import Button from "../../../../shared/atoms/Button";
import Avatar from "../../../../shared/Avatar";
import NoDataFound from "../../../../shared/atoms/NoDataFound";
import CircularLoader from "../../../../shared/atoms/CircularLoader";
import WrapperHoverCard from "../../../../shared/WrapperHoverCard";
import { errorResponseFormater } from "../../../../../utils/errorResponseFormater";

/**
 * Reportees sidebar loading skeleton
 */
const ReporteesSidebarSkeleton: React.FC = () => (
  <div className="space-y-3 animate-pulse">
    {[1, 2, 3, 4, 5].map((i) => (
      <div
        key={i}
        className="p-3 rounded-xl border border-gray-100 bg-gray-50 flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-28 bg-gray-200 rounded" />
          <div className="h-2.5 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    ))}
  </div>
);

interface PipSerachEmployeeSectionProps {
  selectedEmployeeId: string;
  onSelectEmployeeId: (id: string) => void;
  isAdmin: boolean;
  isViewingOtherUser: boolean;
  targetEmployeeId?: string | null;
  currentEmployeeId?: string;
  isEmployeeLoading?: boolean;
  onEmployeesLoaded?: (employees: ActiveRepotreeTypes[]) => void;
  viewMode?: "admin" | "manager";
  onViewModeChange?: (mode: "admin" | "manager") => void;
  canAdminAdminView?: boolean;
  canAdminManagerView?: boolean;
}

export const PipSerachEmployeeSection: React.FC<PipSerachEmployeeSectionProps> = ({
  selectedEmployeeId,
  onSelectEmployeeId,
  isAdmin,
  isViewingOtherUser,
  targetEmployeeId,
  currentEmployeeId,
  isEmployeeLoading = false,
  onEmployeesLoaded,
  viewMode = "admin",
  onViewModeChange,
  canAdminAdminView = true,
  canAdminManagerView = true,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const showTabs =
    isAdmin && !isViewingOtherUser && canAdminAdminView && canAdminManagerView;
  const isAllEmployeesMode =
    isAdmin &&
    !isViewingOtherUser &&
    canAdminAdminView &&
    (viewMode === "admin" || !canAdminManagerView);
  const reporteeManagerId = isViewingOtherUser
    ? (targetEmployeeId ?? "")
    : (currentEmployeeId ?? "");

  const {
    data: allActiveEmployeesData,
    isLoading: isLoadingAllEmployees,
    isError: isAllEmployeesError,
    error: allEmployeesError,
    refetch: refetchAllEmployees,
    fetchNextPage: fetchNextPageAll,
    hasNextPage: hasNextPageAll,
    isFetchingNextPage: isFetchingNextPageAll,
  } = useInfiniteAllActiveEmployees(debouncedSearchTerm, isAllEmployeesMode);

  const {
    data: reporteesData,
    isLoading: isLoadingReportees,
    isError: isReporteesError,
    error: reporteesError,
    refetch: refetchReportees,
    fetchNextPage: fetchNextPageReportees,
    hasNextPage: hasNextPageReportees,
    isFetchingNextPage: isFetchingNextPageReportees,
  } = useInfiniteActiveReportees(
    reporteeManagerId,
    debouncedSearchTerm,
    !isAllEmployeesMode
  );

  const allActiveEmployees = useMemo(() => {
    const raw = allActiveEmployeesData?.pages.flatMap((page) => page) ?? [];
    const seen = new Set<string>();
    return raw.filter((emp) => {
      if (!emp?.name || seen.has(emp.name)) return false;
      seen.add(emp.name);
      return true;
    });
  }, [allActiveEmployeesData]);

  const reportees = useMemo(() => {
    const raw = reporteesData?.pages.flatMap((page) => page) ?? [];
    const seen = new Set<string>();
    return raw.filter((emp) => {
      if (!emp?.name || seen.has(emp.name)) return false;
      seen.add(emp.name);
      return true;
    });
  }, [reporteesData]);

  const employeeList = isAllEmployeesMode ? allActiveEmployees : reportees;
  const isLoadingEmployees = isAllEmployeesMode
    ? isLoadingAllEmployees
    : (isLoadingReportees || isEmployeeLoading);
  const isEmployeesError = isAllEmployeesMode
    ? isAllEmployeesError
    : isReporteesError;
  const employeesError = isAllEmployeesMode
    ? allEmployeesError
    : reporteesError;
  const refetchEmployees = isAllEmployeesMode
    ? refetchAllEmployees
    : refetchReportees;

  const hasNextPage = isAllEmployeesMode ? hasNextPageAll : hasNextPageReportees;
  const isFetchingNextPage = isAllEmployeesMode
    ? isFetchingNextPageAll
    : isFetchingNextPageReportees;
  const fetchNextPage = isAllEmployeesMode
    ? fetchNextPageAll
    : fetchNextPageReportees;

  // Inform parent of current employee list
  React.useEffect(() => {
    if (onEmployeesLoaded) {
      onEmployeesLoaded(employeeList);
    }
  }, [employeeList, onEmployeesLoaded]);

  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3.5">
      {/* Admin / Manager Switch Tabs (Only for Admin when not viewing other user) */}
      {showTabs && (
        <div className="bg-gray-100/90 p-1 rounded-xl flex items-center gap-1 border border-gray-200/70">
          <button
            type="button"
            onClick={() => {
              if (viewMode !== "admin") {
                onViewModeChange?.("admin");
                setSearchTerm("");
              }
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === "admin"
                ? "bg-white text-primary-700 shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin View</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (viewMode !== "manager") {
                onViewModeChange?.("manager");
                setSearchTerm("");
              }
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              viewMode === "manager"
                ? "bg-white text-primary-700 shadow-2xs font-bold"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Manager View</span>
          </button>
        </div>
      )}

      {/* Sidebar Header with Title, Count badge, and explanatory caption */}
      <div className="space-y-1 pb-2.5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" />
            <Typography variant="label" className="font-bold text-gray-800 uppercase tracking-wider block">
              {isAllEmployeesMode ? "All Employees" : (showTabs ? "My Reportees" : "Direct Reportees")}
            </Typography>
          </div>
          <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-semibold bg-gray-100 text-gray-700">
            {employeeList.length}
          </span>
        </div>
        <Typography variant="caption" className="text-gray-500 text-[11px] leading-relaxed block">
          {isAllEmployeesMode
            ? "Select an employee to view history or initiate PIP."
            : "Select a direct reportee to track performance."}
        </Typography>
      </div>

      {/* Search Box */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder={isAllEmployeesMode ? "Search by name or ID..." : "Search reportee..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-8 py-2 bg-gray-50/60 hover:bg-gray-50 focus:bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-md hover:bg-gray-200/60 transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Employees List with infinite scroll */}
      <div
        onScroll={handleSidebarScroll}
        className="flex flex-col gap-1.5 max-h-52 sm:max-h-64 lg:max-h-[580px] overflow-y-auto pr-0.5"
      >
        {isLoadingEmployees ? (
          <ReporteesSidebarSkeleton />
        ) : isEmployeesError ? (
          <div className="p-4 text-center space-y-2">
            <Typography variant="caption" className="text-red-600 font-medium block">
              {errorResponseFormater(
                employeesError,
                `Failed to load ${isAllEmployeesMode ? "employees" : "reportees"}.`
              )}
            </Typography>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchEmployees()}
            >
              Retry
            </Button>
          </div>
        ) : employeeList.length === 0 ? (
          <div className="py-4 lg:py-8 px-2 text-center">
            <NoDataFound
              title={isAllEmployeesMode ? "No Employees Found" : "No Reportees Found"}
              subtitle={
                searchTerm
                  ? (isAllEmployeesMode ? "No employee matches your search query." : "No reportee matches your search query.")
                  : (isAllEmployeesMode ? "No active employees found in the organization." : "No active reportees found under your reporting hierarchy.")
              }
            />
          </div>
        ) : (
          <>
            {employeeList.map((emp) => {
              const isSelected = selectedEmployeeId === emp.name;
              const designationTitle =
                emp.custom_designation_title ||
                emp.designation_name ||
                emp.designation ||
                "—";
              const departmentDisplay = emp.department_name || "";

              return (
                <div
                  key={emp.name}
                  onClick={() => onSelectEmployeeId(emp.name)}
                  className={`w-full text-left rounded-xl p-3 transition-all flex items-center justify-between gap-3 border cursor-pointer ${isSelected
                      ? "bg-primary text-white border-primary shadow-xs"
                      : "bg-white text-gray-800 hover:bg-gray-50 border-gray-200"
                    }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar
                      src={emp.image || undefined}
                      name={emp.employee_name || emp.name}
                      size="h-9 w-9"
                      fontSize="text-xs"
                    />

                    <div className="min-w-0 flex-1">
                      <WrapperHoverCard employeeId={emp.name}>
                        <span className="inline-block max-w-full truncate hover:underline cursor-pointer">
                          <Typography
                            variant="bodySmall"
                            className={`font-semibold truncate block ${isSelected ? "text-white" : "text-gray-900"
                              }`}
                          >
                            {emp.employee_name || emp.name}
                          </Typography>
                        </span>
                      </WrapperHoverCard>
                      <Typography
                        variant="caption"
                        className={`truncate font-normal mt-0.5 block ${isSelected ? "text-white/85" : "text-gray-500"
                          }`}
                      >
                        {designationTitle}
                      </Typography>
                    </div>
                  </div>

                  {departmentDisplay && (
                    <Typography
                      variant="caption"
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md self-center shrink-0 hidden sm:inline-block max-w-[80px] truncate ${isSelected
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      {departmentDisplay}
                    </Typography>
                  )}
                </div>
              );
            })}

            {/* Loading indicator when scrolling to load more */}
            {isFetchingNextPage && (
              <div className="py-3 flex items-center justify-center gap-2">
                <CircularLoader size="sm" color="blue-500" />
                <Typography variant="caption" className="text-gray-500 font-medium">
                  Loading more...
                </Typography>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default PipSerachEmployeeSection;
