import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  useCurrentEmployeeDetails,
  useEmployee,
} from "../../../../hooks/useEmployee";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import {
  useActiveReportees,
  usePipFlowRequestsByEmployee,
} from "../../../../hooks/usePip";
import {
  useFlowConfigOthersTriggerList,
  getDefinitionByFilter,
  useChatAssistantFlowInitiateData,
} from "../../../../hooks/useFlows";
import type { FlowRequestItem } from "../../../../types/flows";
import type { ActiveRepotreeTypes } from "../../../../services/pipService";

import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import { Card } from "../../../shared/atoms/Card";
import Avatar from "../../../shared/Avatar";
import NoDataFound from "../../../shared/atoms/NoDataFound";
import ActionConfirmationModal from "../../../shared/ActionConfirmationModal";
import CardStages from "../components/StageCard";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";

import { formatDateDDMonthYYYY } from "../../../../utils/formatToIndianDate";
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
  <div className="space-y-6 animate-pulse">
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-6 w-24 bg-gray-200 rounded-md" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-48 bg-gray-200 rounded" />
        <div className="h-3 w-64 bg-gray-200 rounded" />
      </div>
      <div className="h-9 w-32 bg-gray-200 rounded-lg" />
    </div>
  </div>
);

const PerformanceImprovementPlan: React.FC = () => {
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

  // Active direct reportees
  const {
    data: reportees = [],
    isLoading: isLoadingReportees,
    isError: isReporteesError,
    error: reporteesError,
    refetch: refetchReportees,
  } = useActiveReportees(effectiveEmployeeId || "");

  // Search & selected state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showTimelineDetails, setShowTimelineDetails] = useState(false);

  // Filter reportees by search term
  const filteredReportees = useMemo(() => {
    if (!Array.isArray(reportees)) return [];
    if (!searchTerm.trim()) return reportees;
    const term = searchTerm.toLowerCase();
    return reportees.filter((emp) => {
      const name = emp.employee_name?.toLowerCase() || "";
      const title =
        emp.custom_designation_title?.toLowerCase() ||
        emp.designation_name?.toLowerCase() ||
        emp.designation?.toLowerCase() ||
        "";
      const dept =
        emp.department_name?.toLowerCase() ||
        emp.department?.toLowerCase() ||
        "";
      const empId = emp.name?.toLowerCase() || "";
      return (
        name.includes(term) ||
        title.includes(term) ||
        dept.includes(term) ||
        empId.includes(term)
      );
    });
  }, [reportees, searchTerm]);

  // Derive active selected employee
  const selectedEmployee: ActiveRepotreeTypes | undefined = useMemo(() => {
    if (!reportees || reportees.length === 0) return undefined;
    if (selectedEmployeeId) {
      const found = reportees.find((emp) => emp.name === selectedEmployeeId);
      if (found) return found;
    }
    return reportees[0];
  }, [reportees, selectedEmployeeId]);

  const activeEmployeeId = selectedEmployee?.name;

  // PIP Flow requests for selected employee
  const {
    data: pipFlowRequests,
    isLoading: isLoadingPipFlow,
    isError: isPipFlowError,
    error: pipFlowError,
    refetch: refetchPipFlow,
  } = usePipFlowRequestsByEmployee(activeEmployeeId);

  const activePipFlow: FlowRequestItem | undefined = useMemo(() => {
    if (!Array.isArray(pipFlowRequests) || pipFlowRequests.length === 0) return undefined;
    const match = pipFlowRequests.find((item) => item.flow_name === "1_PIP_Init");
    return match || pipFlowRequests[0];
  }, [pipFlowRequests]);
  const hasStartedFlow = Boolean(activePipFlow);

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

  const statusBadge = getStatusBadge(
    activePipFlow?.overall_flow_status || activePipFlow?.approval_status
  );

  return (
    <div className="w-full p-4 md:p-6 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
        <div className="flex flex-col">
          <Typography variant="h4">Performance Improvement (PIP)</Typography>
          <Typography variant="bodySmall" color="body2">
            Track, initiate, and monitor Performance Improvement Plans for your active reportees.
          </Typography>
        </div>
        <div className="flex items-center gap-2">
          <Typography
            variant="caption"
            className="inline-flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-xl bg-primary-50 text-primary-700 border border-primary-200 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
            Active Reportees Only
          </Typography>
        </div>
      </div>

      {/* Main Layout: Left Sidebar + Right Details Panel */}
      <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Column: Searchable & Scrollable Reportees Sidebar */}
        <aside className="w-full lg:w-80 shrink-0 bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-gray-100">
            <Typography variant="label" className="font-bold text-gray-700 uppercase tracking-wider block">
              Reportees ({filteredReportees.length})
            </Typography>
          </div>

          {/* Search Box */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reportee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all placeholder:text-gray-400"
            />
          </div>

          {/* Reportees List */}
          <div className="flex flex-col gap-1.5 max-h-[580px] overflow-y-auto pr-0.5">
            {isLoadingReportees || isEmployeeLoading ? (
              <ReporteesSidebarSkeleton />
            ) : isReporteesError ? (
              <div className="p-4 text-center space-y-2">
                <Typography variant="caption" className="text-red-600 font-medium block">
                  {errorResponseFormater(reporteesError, "Failed to load reportees.")}
                </Typography>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchReportees()}
                >
                  Retry
                </Button>
              </div>
            ) : filteredReportees.length === 0 ? (
              <div className="py-8 px-2 text-center">
                <NoDataFound
                  title="No Reportees Found"
                  subtitle={
                    searchTerm
                      ? "No reportee matches your search query."
                      : "No active reportees found under your reporting hierarchy."
                  }
                />
              </div>
            ) : (
              filteredReportees.map((emp) => {
                const isSelected =
                  (selectedEmployee?.name || selectedEmployeeId) === emp.name;
                const designationTitle =
                  emp.designation_name ||
                  emp.custom_designation_title ||
                  "—";
                const departmentDisplay =
                  emp.department_name || "";

                return (
                  <div
                    key={emp.name}
                    onClick={() => {
                      setSelectedEmployeeId(emp.name);
                      setShowTimelineDetails(false);
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
              })
            )}
          </div>
        </aside>

        {/* Right Column: Selected Employee Details & PIP 1 Card / Flow Details */}
        <main className="flex-1 w-full space-y-6">
          {!selectedEmployee ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 shadow-xs flex flex-col items-center justify-center text-center min-h-[350px]">
              <NoDataFound
                title="No Employee Selected"
                subtitle="Select an active reportee from the left list to view or initiate their Performance Improvement Plan."
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
                        {selectedEmployee.designation_name ||
                          selectedEmployee.custom_designation_title ||
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
                  {effectiveEmployeeId ? (
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

              {/* PIP 1 Card Section */}
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
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {/* PIP 1 Card */}
                  <div
                    className={`rounded-2xl border p-6 flex flex-col justify-between gap-5 transition-all shadow-xs ${hasStartedFlow
                      ? "bg-white border-blue-200 ring-1 ring-blue-50"
                      : "bg-white border-gray-200"
                      }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary flex items-center justify-center font-bold text-xs">
                          1
                        </div>
                        <Typography variant="subheading" className="text-gray-900">
                          PIP 1 (Cycle 1)
                        </Typography>
                      </div>
                      {hasStartedFlow ? (
                        <Typography
                          variant="caption"
                          className={`inline-flex items-center gap-1.5 font-semibold px-3 py-1 rounded-xl border ${statusBadge.bg}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </Typography>
                      ) : (
                        <Typography
                          variant="caption"
                          className="inline-flex items-center gap-1.5 font-semibold px-2.5 py-0.5 rounded-xl bg-gray-100 text-gray-600"
                        >
                          Not Started
                        </Typography>
                      )}
                    </div>

                    {/* Body Content */}
                    {!hasStartedFlow ? (
                      <div className="space-y-4">
                        <Typography variant="bodySmall" className="text-gray-600 leading-relaxed block">
                          No Performance Improvement Plan (PIP) is currently active for{" "}
                          <strong className="text-gray-800">
                            {selectedEmployee.employee_name || selectedEmployee.name}
                          </strong>
                          . You can initiate a new PIP cycle through the approval workflow below.
                        </Typography>

                        <div className="pt-2">
                          <Button
                            variant="contain"
                            size="md"
                            onClick={handleOpenInitiateModal}
                            disabled={isTriggerLoading || isInitiatingFlow}
                            className="shadow-xs font-semibold"
                            icon={<Plus className="w-4 h-4" />}
                          >
                            Initiate PIP 1
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Summary Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                            <Typography variant="caption" className="text-gray-500 font-medium block">
                              Creation Date
                            </Typography>
                            <Typography variant="bodySmall" className="font-semibold text-gray-800 mt-1 block">
                              {formatDateDDMonthYYYY(
                                activePipFlow?.initiated_on ||
                                activePipFlow?.activity_timestamp ||
                                ((activePipFlow as Record<string, unknown> | undefined)?.creation as string)
                              )}
                            </Typography>
                          </div>
                          <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                            <Typography variant="caption" className="text-gray-500 font-medium block">
                              Workflow Status
                            </Typography>
                            <Typography
                              variant="bodySmall"
                              className={`font-semibold mt-1 block ${activePipFlow?.approval_status === "Approved"
                                ? "text-emerald-700"
                                : activePipFlow?.approval_status === "Rejected"
                                  ? "text-rose-700"
                                  : "text-amber-700"
                                }`}
                            >
                              {activePipFlow?.approval_status || activePipFlow?.overall_flow_status || activePipFlow?.workflow_status || "Pending"}
                            </Typography>
                          </div>
                          <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                            <Typography variant="caption" className="text-gray-500 font-medium block">
                              Flow Type
                            </Typography>
                            <Typography variant="bodySmall" className="font-semibold text-gray-800 mt-1 block">
                              {activePipFlow?.flow_name || activePipFlow?.category || "PIP Flow"}
                            </Typography>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowTimelineDetails((prev) => !prev)}
                            className="font-medium text-xs"
                            icon={
                              showTimelineDetails ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )
                            }
                          >
                            {showTimelineDetails ? "Hide Approval Stages" : "View Approval Stages"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Flow Approval Stages Timeline (Shown when flow is started & details toggled) */}
                  {hasStartedFlow && showTimelineDetails && activePipFlow && (
                    <Card className="p-6 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="space-y-0.5">
                          <Typography variant="subheading" className="text-gray-900 font-bold">
                            Flow Approval Stages Timeline
                          </Typography>
                          <Typography variant="bodySmall" color="body2">
                            Track the step-by-step progress and decision history for this PIP flow.
                          </Typography>
                        </div>
                        <Typography
                          variant="caption"
                          className={`inline-flex items-center gap-1.5 font-semibold px-2.5 py-1 rounded-xl border ${statusBadge.bg}`}
                        >
                          {statusBadge.icon}
                          {statusBadge.label}
                        </Typography>
                      </div>

                      {/* Approval Stages Timeline List */}
                      <div className="flex flex-col pt-1">
                        {(!activePipFlow.approval_stages ||
                          activePipFlow.approval_stages.length === 0) ? (
                          <div className="py-6 text-center text-gray-500 text-xs">
                            No approval stages found for this request.
                          </div>
                        ) : (
                          activePipFlow.approval_stages.map((stage, idx) => {
                            const isActive =
                              stage.status === "Pending" &&
                              (idx === 0 ||
                                activePipFlow.approval_stages[idx - 1].status ===
                                "Approved");
                            const isLastStage =
                              idx === activePipFlow.approval_stages.length - 1;

                            return (
                              <CardStages
                                key={stage?.stage_name ?? `stage-${idx}`}
                                stage={stage}
                                isActive={isActive}
                                isLastStage={isLastStage}
                              />
                            );
                          })
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              )}
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
