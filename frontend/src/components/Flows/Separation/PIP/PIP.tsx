import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  useCurrentEmployeeDetails,
  useEmployee,
} from "../../../../hooks/useEmployee";
import { useCurrentUser, isAdminUser } from "../../../../hooks/useCurrentUser";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import {
  useInfiniteAllActiveEmployees,
  useInfiniteActiveReportees,
  usePipFlowRequestsForEmployee,
} from "../../../../hooks/usePip";
import useDebounce from "../../../../hooks/useDebounce";
import {
  useFlowConfigOthersTriggerList,
  getDefinitionByFilter,
  useChatAssistantFlowInitiateData,
} from "../../../../hooks/useFlows";
import type { FlowRequestItem } from "../../../../types/flows";
import type { ActiveRepotreeTypes } from "../../../../services/pipService";

import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import Avatar from "../../../shared/Avatar";
import NoDataFound from "../../../shared/atoms/NoDataFound";
import CircularLoader from "../../../shared/atoms/CircularLoader";
import ActionConfirmationModal from "../../../shared/ActionConfirmationModal";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";

import formatToIndianDate from "../../../../utils/formatToIndianDate";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";

/**
 * Helper to get status styling badge for a flow approval status
 */
const getStatusBadge = (status?: string) => {
  const normalized = (status || "Pending").toLowerCase();
  if (normalized === "approved" || normalized === "completed") {
    return {
      bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      label: status || "Approved",
    };
  }
  if (normalized === "rejected") {
    return {
      bg: "bg-rose-50 border-rose-200 text-rose-700",
      icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
      label: "Rejected",
    };
  }
  return {
    bg: "bg-amber-50 border-amber-200 text-amber-700",
    icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    label: status || "Pending Approval",
  };
};

/**
 * Helper to format card title for PIP cycles
 */
const getPipTitle = (item: FlowRequestItem, idx: number) => {
  if (item.flow_name === "1_PIP_Init") return "PIP 1 (Cycle 1)";
  if (item.flow_name) {
    const match = item.flow_name.match(/^(\d+)[_\s-]*pip/i);
    if (match) {
      return `PIP ${match[1]} (Cycle ${match[1]})`;
    }
    return item.flow_name;
  }
  return `PIP Cycle ${idx + 1}`;
};

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

/**
 * PIP details loading skeleton
 */
const PipCardSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 animate-pulse">
    {[1, 2].map((i) => (
      <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gray-200" />
            <div className="h-4 w-28 bg-gray-200 rounded" />
          </div>
          <div className="h-6 w-20 bg-gray-200 rounded-md" />
        </div>
        <div className="space-y-2">
          <div className="h-7 bg-gray-100 rounded-xl" />
          <div className="h-7 bg-gray-100 rounded-xl" />
          <div className="h-7 bg-gray-100 rounded-xl" />
        </div>
        <div className="h-9 w-full bg-gray-200 rounded-xl pt-2" />
      </div>
    ))}
  </div>
);

const PerformanceImprovementPlan: React.FC = () => {
  // Current user & admin check
  const { data: currentUser } = useCurrentUser();
  const isAdmin = isAdminUser(currentUser ?? null);

  // Current user & target user context
  const { isViewingOtherUser, targetEmployeeId } = useTargetUser();
  const { data: currentEmployee, isLoading: isEmployeeLoading } =
    useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { data: targetEmployee } = useEmployee(
    isViewingOtherUser ? targetEmployeeId : null
  );

  const effectiveEmployee = isViewingOtherUser ? targetEmployee : currentEmployee;
  const effectiveEmployeeId = isViewingOtherUser
    ? targetEmployeeId || ""
    : currentEmployee?.name || "";
  const effectiveEmployeeName =
    effectiveEmployee?.employee_name || effectiveEmployee?.name || "You";

  // Search state with debounce for backend search
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Three-case employee list resolution with infinite scrolling & backend search:
  // 1. Admin & not impersonating -> All active employees
  // 2. Admin & impersonating -> Impersonated employee's direct reportees
  // 3. Non-admin -> Logged in employee's direct reportees
  const isAllEmployeesMode = isAdmin && !isViewingOtherUser;
  const reporteeManagerId = isViewingOtherUser
    ? (targetEmployeeId ?? "")
    : (!isAdmin ? (currentEmployee?.name ?? "") : "");

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
  } = useInfiniteActiveReportees(reporteeManagerId, debouncedSearchTerm, !isAllEmployeesMode);

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

  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    }
  };

  // Derive active selected employee
  const selectedEmployee: ActiveRepotreeTypes | undefined = useMemo(() => {
    if (!employeeList || employeeList.length === 0) return undefined;
    if (selectedEmployeeId) {
      const found = employeeList.find((emp) => emp.name === selectedEmployeeId);
      if (found) return found;
    }
    return employeeList[0];
  }, [employeeList, selectedEmployeeId]);

  const activeEmployeeId = selectedEmployee?.name;

  // PIP Flow requests for selected employee (scoped via X-Target-Employee-Id header)
  const {
    data: pipFlowRequests,
    isLoading: isLoadingPipFlow,
    isError: isPipFlowError,
    error: pipFlowError,
    refetch: refetchPipFlow,
  } = usePipFlowRequestsForEmployee(activeEmployeeId);

  // Trigger definition for initiating PIP
  const { data: triggerDefinitions, isLoading: isTriggerLoading } =
    useFlowConfigOthersTriggerList(activeEmployeeId ?? "");

  const pipDefinition = useMemo(() => {
    if (!Array.isArray(triggerDefinitions)) return undefined;

    // 1. Exact match for 1_PIP_Init by name, button_label, or action name
    const exact1Pip = triggerDefinitions.find((t) => {
      const name = (t?.name || "").toLowerCase();
      const actionName = (t?.data_obj?.name_of_action || "").toLowerCase();
      const btnLabel = (
        t?.button_label ||
        t?.data_obj?.button_label ||
        ""
      ).toLowerCase();
      return (
        name === "1_pip_init" ||
        name.includes("1_pip_init") ||
        actionName === "1_pip_init" ||
        actionName.includes("1_pip_init") ||
        btnLabel === "1_pip_init" ||
        btnLabel.includes("1_pip_init") ||
        name === "1_pip" ||
        actionName === "1_pip"
      );
    });
    if (exact1Pip) return exact1Pip;

    // 2. Check by buttonLabel: "1_PIP_Init" in PIP category
    const byCategoryAndLabel = getDefinitionByFilter(triggerDefinitions, {
      triggerCategory: "PIP",
      buttonLabel: "1_PIP_Init",
    });
    if (byCategoryAndLabel) return byCategoryAndLabel;

    // 3. Search for any item with "1" and "pip"
    const match1Pip = triggerDefinitions.find((t) => {
      const name = (t?.name || "").toLowerCase();
      const actionName = (t?.data_obj?.name_of_action || "").toLowerCase();
      const btnLabel = (
        t?.button_label ||
        t?.data_obj?.button_label ||
        ""
      ).toLowerCase();
      return (
        (name.includes("1") && name.includes("pip")) ||
        (actionName.includes("1") && actionName.includes("pip")) ||
        (btnLabel.includes("1") && btnLabel.includes("pip"))
      );
    });
    if (match1Pip) return match1Pip;

    // 4. Exact triggerCategory match: "1_PIP_Init" or "PIP"
    const byExactCat = getDefinitionByFilter(triggerDefinitions, {
      triggerCategory: "1_PIP_Init",
    });
    if (byExactCat) return byExactCat;

    const byPipCategory = getDefinitionByFilter(triggerDefinitions, {
      triggerCategory: "PIP",
    });
    if (byPipCategory) return byPipCategory;

    // 5. Fallback fuzzy match
    return triggerDefinitions.find((t) => {
      const actionName = (t?.data_obj?.name_of_action || "").toLowerCase();
      const btnLabel = (
        t?.button_label ||
        t?.data_obj?.button_label ||
        ""
      ).toLowerCase();
      const nodeLabel = (t?.data_obj?.node_label || "").toLowerCase();
      const name = (t?.name || "").toLowerCase();
      const catName = (
        t?.trigger_category_name ||
        t?.trigger_category?.name ||
        ""
      ).toLowerCase();
      return (
        actionName.includes("pip") ||
        btnLabel.includes("pip") ||
        nodeLabel.includes("pip") ||
        name.includes("pip") ||
        catName.includes("pip")
      );
    });
  }, [triggerDefinitions]);

  // Initiate flow mutation
  const { mutateAsync: initiateFlow, isPending: isInitiatingFlow } =
    useChatAssistantFlowInitiateData();

  const handleOpenInitiateModal = () => {
    if (!selectedEmployee) return;
    setIsConfirmModalOpen(true);
  };

  const handleConfirmInitiate = async () => {
    if (!selectedEmployee) return;

    const definitionName = pipDefinition?.name || "1_PIP_Init";

    try {
      const result = await initiateFlow({
        document_name: selectedEmployee.name,
        definition_name: definitionName,
      });

      setIsConfirmModalOpen(false);

      if (
        typeof window !== "undefined" &&
        typeof window.trigger_chatnext_assistant === "function"
      ) {
        window.trigger_chatnext_assistant(true, result?.session);
      } else {
        toast.success(
          `PIP flow initiated successfully for ${selectedEmployee.employee_name || selectedEmployee.name}`
        );
      }

      refetchPipFlow();
    } catch (error) {
      toast.error(
        errorResponseFormater(error, "Failed to initiate PIP flow.")
      );
      setIsConfirmModalOpen(false);
    }
  };

  // Open flow request details page with selected employee impersonated
  const handleViewFlowRequest = (flowItem: FlowRequestItem) => {
    const requestId = flowItem.name || flowItem.request_id;
    if (!requestId) return;
    const targetId = selectedEmployee?.name || activeEmployeeId;
    const query = targetId ? `?target_user=${encodeURIComponent(targetId)}` : "";
    const url = `/webapp/flow-app/flow-request/${encodeURIComponent(requestId)}${query}`;
    window.open(url, "_blank");
  };

  return (
    <div className="w-full p-4 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex flex-col">
          <Typography variant="h4">Performance Improvement (PIP)</Typography>
          <Typography variant="bodySmall" color="body2">
            Track, initiate, and monitor Performance Improvement Plans for {isAllEmployeesMode ? "active employees" : "your active reportees"}.
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Typography
            variant="caption"
            className="inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 border border-primary-200 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
            {isAllEmployeesMode ? "All Active Employees" : "Active Reportees Only"}
          </Typography>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Right Details Panel */}
      <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Searchable & Scrollable Employees Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3.5">
          {/* Sidebar Header with Title, Count badge, and explanatory caption */}
          <div className="space-y-1 pb-2.5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-600" />
                <Typography variant="label" className="font-bold text-gray-800 uppercase tracking-wider block">
                  {isAllEmployeesMode ? "All Employees" : "Direct Reportees"}
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
            className="flex flex-col gap-1.5 max-h-[580px] overflow-y-auto pr-0.5"
          >
            {isLoadingEmployees ? (
              <ReporteesSidebarSkeleton />
            ) : isEmployeesError ? (
              <div className="p-4 text-center space-y-2">
                <Typography variant="caption" className="text-red-600 font-medium block">
                  {errorResponseFormater(employeesError, `Failed to load ${isAllEmployeesMode ? "employees" : "reportees"}.`)}
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
              <div className="py-8 px-2 text-center">
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
                  const isSelected =
                    (selectedEmployee?.name || selectedEmployeeId) === emp.name;
                  const designationTitle =
                    emp.custom_designation_title ||
                    emp.designation_name ||
                    emp.designation ||
                    "—";
                  const departmentDisplay =
                    emp.department_name || "";

                  return (
                    <div
                      key={emp.name}
                      onClick={() => {
                        setSelectedEmployeeId(emp.name);
                      }}
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

        {/* Right Column: Selected Employee Details & PIP Cards */}
        <main className="flex-1 w-full space-y-6">
          {!selectedEmployee ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-xs flex flex-col items-center justify-center text-center min-h-[350px]">
              <NoDataFound
                title="No Employee Selected"
                subtitle={
                  isAllEmployeesMode
                    ? "Select an active employee from the left list to view or initiate their Performance Improvement Plan."
                    : "Select an active reportee from the left list to view or initiate their Performance Improvement Plan."
                }
              />
            </div>
          ) : (
            <>
              {/* Selected Employee Info Banner */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={selectedEmployee.image || undefined}
                    name={selectedEmployee.employee_name || selectedEmployee.name}
                    size="h-14 w-14"
                    fontSize="text-xl"
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <WrapperHoverCard employeeId={selectedEmployee.name}>
                        <div className="cursor-pointer hover:opacity-80 transition-opacity">
                          <Typography variant="h4" className="text-gray-900">
                            {selectedEmployee.employee_name || selectedEmployee.name}
                          </Typography>
                        </div>
                      </WrapperHoverCard>
                      <Typography variant="caption" className="px-2.5 py-0.5 text-[11px] font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {selectedEmployee.status || "Active"}
                      </Typography>
                    </div>
                    <Typography variant="caption" className="text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                      <Typography variant="caption" className="font-semibold text-gray-800">
                        {selectedEmployee.custom_designation_title ||
                          selectedEmployee.designation_name ||
                          selectedEmployee.designation ||
                          "—"}
                      </Typography>
                      {selectedEmployee.department_name && (
                        <>
                          <Typography variant="caption">&bull;</Typography>
                          <Typography variant="caption">
                            {selectedEmployee.department_name}
                          </Typography>
                        </>
                      )}
                      {selectedEmployee.company_name && (
                        <>
                          <Typography variant="caption">&bull;</Typography>
                          <Typography variant="caption">
                            {selectedEmployee.company_name}
                          </Typography>
                        </>
                      )}
                      <Typography variant="caption">&bull;</Typography>
                      <WrapperHoverCard employeeId={selectedEmployee.name}>
                        <Typography variant="caption" className="text-gray-500 cursor-pointer hover:underline">
                          {selectedEmployee.name}
                        </Typography>
                      </WrapperHoverCard>
                    </Typography>
                  </div>
                </div>

                <div className="font-medium text-gray-600 bg-gray-50/80 px-3.5 py-2 rounded-xl border border-gray-200 self-start sm:self-center flex items-center gap-1.5 text-xs flex-wrap">
                  <Typography variant="caption" className="font-medium text-gray-600">
                    Reporting To:
                  </Typography>
                  {isAllEmployeesMode ? (
                    selectedEmployee.reports_to ? (
                      <WrapperHoverCard employeeId={selectedEmployee.reports_to}>
                        <span className="cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center gap-1">
                          <strong className="text-gray-900 font-bold">
                            {selectedEmployee.reports_to}
                          </strong>
                        </span>
                      </WrapperHoverCard>
                    ) : (
                      <strong className="text-gray-900 font-bold">—</strong>
                    )
                  ) : effectiveEmployeeId ? (
                    <WrapperHoverCard employeeId={effectiveEmployeeId}>
                      <span className="cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center gap-1">
                        <strong className="text-gray-900 font-bold">
                          {effectiveEmployeeName}
                        </strong>
                        <span className="text-gray-500 font-semibold text-[11px]">
                          ({effectiveEmployeeId})
                        </span>
                      </span>
                    </WrapperHoverCard>
                  ) : (
                    <strong className="text-gray-900 font-bold">You</strong>
                  )}
                </div>
              </div>

              {/* PIP Cards Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-gray-100">
                  <div>
                    <Typography variant="subheading" className="text-gray-900 font-bold">
                      Performance Improvement Plans {pipFlowRequests && pipFlowRequests.length > 0 ? `(${pipFlowRequests.length})` : ""}
                    </Typography>
                    <Typography variant="bodySmall" color="body2">
                      View active and historical PIP cycles for this employee.
                    </Typography>
                  </div>
                  {pipFlowRequests && pipFlowRequests.length > 0 && (
                    <Button
                      variant="contain"
                      size="sm"
                      onClick={handleOpenInitiateModal}
                      disabled={isTriggerLoading || isInitiatingFlow}
                      className="shadow-xs font-semibold self-start sm:self-center"
                      icon={<Plus className="w-4 h-4" />}
                    >
                      Initiate PIP
                    </Button>
                  )}
                </div>

                {isLoadingPipFlow ? (
                  <PipCardSkeleton />
                ) : isPipFlowError ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <Typography variant="bodyMedium" className="text-rose-800 font-semibold">
                      Failed to load PIP details
                    </Typography>
                    <Typography variant="bodySmall" className="text-rose-600">
                      {errorResponseFormater(pipFlowError, "Could not fetch PIP status for this employee.")}
                    </Typography>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchPipFlow()}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : !pipFlowRequests || pipFlowRequests.length === 0 ? (
                  <div className="bg-gradient-to-b from-primary-50/30 to-white rounded-2xl border border-primary-100/80 p-8 flex flex-col items-center justify-center text-center gap-4 max-w-lg mx-auto shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 text-primary font-bold text-xl flex items-center justify-center shadow-2xs ring-4 ring-primary-50/60">
                      1
                    </div>
                    <div className="space-y-1">
                      <Typography variant="subheading" className="text-gray-900 font-bold">
                        No PIP Cycles Active
                      </Typography>
                      <Typography variant="bodySmall" className="text-gray-600 max-w-md">
                        No Performance Improvement Plan is currently active for{" "}
                        <strong className="text-gray-800">
                          {selectedEmployee.employee_name || selectedEmployee.name}
                        </strong>
                        . You can initiate a new PIP cycle through the approval workflow.
                      </Typography>
                    </div>
                    <Button
                      variant="contain"
                      size="md"
                      onClick={handleOpenInitiateModal}
                      disabled={isTriggerLoading || isInitiatingFlow}
                      className="shadow-xs font-semibold mt-2"
                      icon={<Plus className="w-4 h-4" />}
                    >
                      Initiate PIP 1 (Cycle 1)
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {pipFlowRequests.map((flowItem, idx) => {
                      const badge = getStatusBadge(
                        flowItem.overall_flow_status || flowItem.approval_status
                      );
                      const title = getPipTitle(flowItem, idx);
                      const cycleNumber = idx + 1;
                      const workflowNumber = flowItem.name || flowItem.request_id || "—";
                      const approvalStagesCount =
                        flowItem.approval_stages?.length ||
                        flowItem.workflow_stages?.length ||
                        0;
                      const approvalStatus =
                        flowItem.approval_status ||
                        flowItem.overall_flow_status ||
                        flowItem.workflow_status ||
                        "Pending";
                      const creationDate = formatToIndianDate(
                        flowItem.initiated_on ||
                          flowItem.activity_timestamp ||
                          ((flowItem as Record<string, unknown> | undefined)?.creation as string)
                      ) || "—";

                      return (
                        <div
                          key={flowItem.name || `pip-flow-${idx}`}
                          className="bg-white rounded-2xl border border-gray-200/90 p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-2xs hover:shadow-md hover:border-primary/50 group"
                        >
                          {/* Card Top / Header */}
                          <div className="space-y-3 pb-3.5 border-b border-gray-100">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ring-2 ring-primary-100">
                                  {cycleNumber}
                                </div>
                                <div>
                                  <Typography variant="subheading" className="text-gray-900 font-bold block leading-tight">
                                    {title}
                                  </Typography>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Workflow</span>
                                    <span className="font-mono text-[11px] font-semibold text-primary-700 bg-primary-50/90 px-2 py-0.5 rounded-lg border border-primary-200/60">
                                      #{workflowNumber}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Typography
                                variant="caption"
                                className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-xl border shrink-0 text-[11px] shadow-2xs ${badge.bg}`}
                              >
                                {badge.icon}
                                {badge.label}
                              </Typography>
                            </div>
                          </div>

                          {/* Card Info Details */}
                          <div className="rounded-xl border border-gray-100 bg-gray-50/60 divide-y divide-gray-100/90 overflow-hidden text-xs">
                            {/* Workflow No. */}
                            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                              <Typography variant="caption" className="text-gray-500 font-medium">
                                Workflow No.
                              </Typography>
                              <Typography variant="caption" className="font-mono font-semibold text-gray-800">
                                {workflowNumber}
                              </Typography>
                            </div>

                            {/* Approval Status */}
                            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                              <Typography variant="caption" className="text-gray-500 font-medium">
                                Approval Status
                              </Typography>
                              <div className="flex items-center gap-1.5">
                                <Typography
                                  variant="caption"
                                  className={`font-semibold ${
                                    approvalStatus.toLowerCase().includes("approved")
                                      ? "text-emerald-700"
                                      : approvalStatus.toLowerCase().includes("rejected")
                                        ? "text-rose-700"
                                        : "text-amber-700"
                                  }`}
                                >
                                  {approvalStatus}
                                </Typography>
                                {approvalStagesCount > 0 && (
                                  <span className="text-[10px] font-medium bg-white text-gray-600 border border-gray-200/80 px-1.5 py-0.5 rounded-md">
                                    {approvalStagesCount} {approvalStagesCount === 1 ? "Stage" : "Stages"}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Creation Date */}
                            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                              <Typography variant="caption" className="text-gray-500 font-medium">
                                Creation Date
                              </Typography>
                              <Typography variant="caption" className="font-semibold text-gray-800">
                                {creationDate}
                              </Typography>
                            </div>

                            {/* Flow Type */}
                            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                              <Typography variant="caption" className="text-gray-500 font-medium">
                                Flow Type
                              </Typography>
                              <Typography variant="caption" className="font-semibold text-gray-800 truncate max-w-[140px]">
                                {flowItem.flow_name || flowItem.category || "PIP Flow"}
                              </Typography>
                            </div>
                          </div>

                          {/* Card Footer / View Button */}
                          <div className="pt-2 border-t border-gray-100">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewFlowRequest(flowItem)}
                              className="w-full justify-center font-semibold text-xs shadow-2xs group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-all duration-200"
                              icon={<ExternalLink className="w-3.5 h-3.5" />}
                            >
                              View Workflow Request
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Confirmation Modal for Initiating PIP */}
      <ActionConfirmationModal
        isOpen={isConfirmModalOpen}
        title="Initiate Performance Improvement Plan"
        message={`Are you sure you want to initiate a PIP flow for ${selectedEmployee?.employee_name || selectedEmployee?.name || "this employee"
          }? This will start the PIP workflow.`}
        confirmLabel="Yes, Initiate PIP"
        cancelLabel="Cancel"
        confirmBgColor="primary"
        isPending={isInitiatingFlow}
        onConfirm={handleConfirmInitiate}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
};

export default PerformanceImprovementPlan;
