import {
  AlertCircle,
  Building,
  Calendar,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Info,
  Laptop,
  Mail,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { differenceInCalendarDays } from "date-fns";
import { ROUTES } from "../../../../constants/routes";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import {
  useCurrentEmployeeDetails,
  useEmployee,
} from "../../../../hooks/useEmployee";
import { useChatAssistantFlowInitiateData } from "../../../../hooks/useFlows";
import { useActiveReportees } from "../../../../hooks/usePip";
import {
  useEmployeeSupportContacts,
  useGetFullAndFinalEstimate,
  useGetSeparationFunnelDetails,
  useGetSeparationOpenItems,
  useGetSeparationWorkflowStages,
} from "../../../../hooks/useSeparation";
import { useMyPendingTaskCounts } from "../../../../hooks/useTasks";
import { useTodoCategories } from "../../../../hooks/useTodo";
import { getFlowConfigOthersTriggerList } from "../../../../services/flowsService";
import { formatCurrency } from "../../../../utils/currency";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import formatToIndianDate from "../../../../utils/formatToIndianDate";
import ActionConfirmationModal from "../../../shared/ActionConfirmationModal";
import Button from "../../../shared/atoms/Button";
import NoDataFound from "../../../shared/atoms/NoDataFound";
import { Typography } from "../../../shared/atoms/Typography";
import { ViewAll } from "../../../shared/atoms/ViewAll";
import Avatar from "../../../shared/Avatar";
import TableSkeleton from "../../../shared/molecules/Skeletons/TableSkeleton";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";

interface ExtendedEmployeeFields {
  relieving_date?: string | null;
  custom_designation_title?: string | null;
  designation_name?: string | null;
  image?: string | null;
}

interface ExtendedFunnelFields {
  custom_final_last_working_day?: string | null;
  custom_proposed_last_working_day?: string | null;
  custom_requested_last_working_date?: string | null;
  relieving_date?: string | null;
}

const getStageIcon = (stageName: string) => {
  const nameLower = stageName.toLowerCase();
  if (
    nameLower.includes("it") ||
    nameLower.includes("asset") ||
    nameLower.includes("laptop")
  ) {
    return <Laptop className="w-3.5 h-3.5 text-gray-500" />;
  }
  if (
    nameLower.includes("finance") ||
    nameLower.includes("pay") ||
    nameLower.includes("expense") ||
    nameLower.includes("settlement")
  ) {
    return <CreditCard className="w-3.5 h-3.5 text-gray-500" />;
  }
  if (nameLower.includes("admin") || nameLower.includes("attendance")) {
    return <Building className="w-3.5 h-3.5 text-gray-500" />;
  }
  return <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />;
};

const ExitPage: React.FC = () => {
  const navigate = useNavigate();

  // 1. Separation Funnel Details & Timeline Stages
  const { data: separationFunnelDetails, isLoading: isLoadingFunnel } =
    useGetSeparationFunnelDetails();
  const funnelItem = separationFunnelDetails?.data?.[0];
  const extendedFunnel = funnelItem as ExtendedFunnelFields | undefined;

  // Identify if separation is initiated by checking approval_stages:
  // custom_status != "Rejected" && docstatus < 2
  const isSeparationInitiated = useMemo(() => {
    if (
      !funnelItem ||
      !funnelItem.approval_stages ||
      funnelItem.approval_stages.length === 0
    ) {
      return false;
    }

    if (
      funnelItem.approval_status === "Rejected" ||
      funnelItem.approval_status === "Revoked"
    ) {
      return false;
    }

    return funnelItem.approval_stages.some((stage) => {
      const refDoc = stage?.todo?.reference_document as
        | Record<string, any>
        | undefined;
      const customStatus =
        refDoc?.custom_status ??
        (stage as any)?.custom_status ??
        (stage?.todo as any)?.custom_status ??
        funnelItem.approval_status;
      const docstatus =
        refDoc?.docstatus ??
        (stage as any)?.docstatus ??
        (stage?.todo as any)?.docstatus;

      const isNotRejected =
        customStatus !== "Rejected" && customStatus !== "Revoked";
      const isDocstatusValid =
        docstatus === undefined || docstatus === null || Number(docstatus) < 2;

      return isNotRejected && isDocstatusValid;
    });
  }, [funnelItem]);

  const hasSeparation = isSeparationInitiated;

  // Todo Categories & Navigation
  const { data: todoCategories = [], isLoading: isLoadingTodoCategories } =
    useTodoCategories(hasSeparation);

  const totalPendingTasks = useMemo(
    () => todoCategories.reduce((sum, cat) => sum + (cat.count || 0), 0),
    [todoCategories],
  );

  const sortedTodoCategories = useMemo(() => {
    return [...todoCategories].sort((a, b) => (b.count || 0) - (a.count || 0));
  }, [todoCategories]);

  // 2. Effective Employee Data
  const { isViewingOtherUser, targetEmployeeId } = useTargetUser();

  const handleCategoryClick = (categoryName: string) => {
    const params = new URLSearchParams();
    if (targetEmployeeId) {
      params.set("target_user", targetEmployeeId);
    }
    params.set("category", categoryName);
    navigate(`/webapp/todo-app?${params.toString()}`);
  };

  const handleNavigateToTodo = () => {
    const params = new URLSearchParams();
    if (targetEmployeeId) {
      params.set("target_user", targetEmployeeId);
    }
    navigate(
      `/webapp/todo-app${params.toString() ? `?${params.toString()}` : ""}`,
    );
  };

  const handleNavigateToAttendance = () => {
    const params = new URLSearchParams();
    if (targetEmployeeId) {
      params.set("target_user", targetEmployeeId);
    }
    navigate(
      `/webapp/attendance/attendance-request${params.toString() ? `?${params.toString()}` : ""}`,
    );
  };

  const handleNavigateToLeave = () => {
    const params = new URLSearchParams();
    if (targetEmployeeId) {
      params.set("target_user", targetEmployeeId);
    }
    navigate(
      `/webapp/leave-app/leaves/leave-requests/my${params.toString() ? `?${params.toString()}` : ""}`,
    );
  };

  const handleNavigateToExpenses = () => {
    const params = new URLSearchParams();
    if (targetEmployeeId) {
      params.set("target_user", targetEmployeeId);
    }
    navigate(
      `/webapp/expenses-app/expenses-list${params.toString() ? `?${params.toString()}` : ""}`,
      { state: { initialFilter: "Pending" } },
    );
  };
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { data: targetEmployee } = useEmployee(
    isViewingOtherUser ? targetEmployeeId : null,
  );

  const effectiveEmployee = isViewingOtherUser
    ? targetEmployee
    : currentEmployee;
  const effectiveEmployeeId = isViewingOtherUser
    ? targetEmployeeId || ""
    : currentEmployee?.name || "";

  const extendedEmp = effectiveEmployee as ExtendedEmployeeFields | undefined;

  const employeeName =
    effectiveEmployee?.employee_name || effectiveEmployee?.name || "N/A";
  const employeeDesignation =
    extendedEmp?.designation_name ||
    extendedEmp?.custom_designation_title ||
    "N/A";
  const employeeDepartment = effectiveEmployee?.department_name || "N/A";
  const employeeCompany = effectiveEmployee?.company_name || "N/A";

  // Support Contacts & Relieving Date (from Employee resource API)
  const { data: supportContacts } =
    useEmployeeSupportContacts(effectiveEmployeeId);

  const relievingDate: string | null =
    supportContacts?.relieving_date ||
    extendedEmp?.relieving_date ||
    extendedFunnel?.custom_final_last_working_day ||
    extendedFunnel?.custom_proposed_last_working_day ||
    extendedFunnel?.custom_requested_last_working_date ||
    extendedFunnel?.relieving_date ||
    null;

  const daysRemaining: number | null = useMemo(() => {
    if (!relievingDate) return null;
    try {
      const today = new Date();
      const target = new Date(relievingDate);
      if (isNaN(target.getTime())) return null;
      const diff = differenceInCalendarDays(target, today);
      return Math.max(0, diff);
    } catch {
      return null;
    }
  }, [relievingDate]);

  const timelineSteps = useMemo(() => {
    if (!hasSeparation || !funnelItem) {
      return [];
    }

    const stages = funnelItem.approval_stages || [];
    if (stages.length === 0) {
      const isOverallRejected = funnelItem.approval_status === "Rejected";
      return [
        {
          label: "Resignation Submitted",
          status: isOverallRejected
            ? ("rejected" as const)
            : ("completed" as const),
          description: isOverallRejected ? "Rejected" : "Submitted",
        },
      ];
    }

    const isOverallRejected = funnelItem.approval_status === "Rejected";
    let foundFirstRejected = false;
    let foundFirstPending = false;

    const approvalSteps = stages.map((stage) => {
      // If a previous stage was already rejected, all followed stages must be inactive
      if (foundFirstRejected) {
        return {
          label: stage.stage_name || "Approval Stage",
          status: "inactive" as const,
          description: "Inactive",
        };
      }

      const isApproved = stage.status === "Approved";
      const isStageRejected =
        stage.status === "Rejected" ||
        stage?.todo?.reference_document?.custom_status === "Rejected";

      if (isApproved) {
        return {
          label: stage.stage_name || "Approval Stage",
          status: "completed" as const,
          description: "Approved",
        };
      }

      if (
        isStageRejected ||
        (isOverallRejected &&
          !foundFirstPending &&
          (stage.status === "Pending" || !stage.status))
      ) {
        foundFirstRejected = true;
        return {
          label: stage.stage_name || "Approval Stage",
          status: "rejected" as const,
          description: "Rejected",
        };
      }

      if (!foundFirstPending && (stage.status === "Pending" || !stage.status)) {
        foundFirstPending = true;
        return {
          label: stage.stage_name || "Approval Stage",
          status: "active" as const,
          description: "In Progress",
        };
      }

      return {
        label: stage.stage_name || "Approval Stage",
        status: "pending" as const,
        description: "Pending",
      };
    });

    return [
      {
        label: "Resignation Submitted",
        status: "completed" as const,
        description: "Submitted",
      },
      ...approvalSteps,
    ];
  }, [hasSeparation, funnelItem]);

  const isRejectedWorkflow = timelineSteps.some((s) => s.status === "rejected");

  const statusDescription = useMemo(() => {
    if (!hasSeparation) {
      return "No active separation request in progress.";
    }
    const rejectedStep = timelineSteps.find((s) => s.status === "rejected");
    if (rejectedStep) {
      return `Separation request was rejected at stage: ${rejectedStep.label}. Subsequent stages discontinued.`;
    }
    const activeStep = timelineSteps.find((s) => s.status === "active");
    if (activeStep) {
      return `Current Stage: ${activeStep.label} (${activeStep.description})`;
    }
    const allCompleted = timelineSteps.every((s) => s.status === "completed");
    if (allCompleted) {
      return "Separation approval workflow completed.";
    }
    return "Separation approval in progress.";
  }, [hasSeparation, timelineSteps]);

  // 3. Active Reportees
  const {
    data: reportees = [],
    isLoading: isLoadingReportees,
    isError: isReporteesError,
    refetch: refetchReportees,
  } = useActiveReportees(effectiveEmployeeId, hasSeparation);

  // Manager Change Flow for Reportees
  const [selectedReporteeForChange, setSelectedReporteeForChange] = useState<{
    name: string;
    employee_name?: string;
    definitionName: string;
  } | null>(null);
  const [isManagerChangeModalOpen, setIsManagerChangeModalOpen] =
    useState(false);
  const [isLoadingTriggerForEmployee, setIsLoadingTriggerForEmployee] =
    useState<string | null>(null);

  const { mutateAsync: initiateFlow, isPending: isInitiatingFlow } =
    useChatAssistantFlowInitiateData();

  const handleOpenManagerChangeModal = async (reportee: {
    name: string;
    employee_name?: string;
  }) => {
    setIsLoadingTriggerForEmployee(reportee.name);
    try {
      const response = await getFlowConfigOthersTriggerList(reportee.name);
      let triggers: any[] = [];
      if (Array.isArray(response)) {
        triggers = response;
      } else if (typeof response === "string") {
        try {
          triggers = JSON.parse(response);
        } catch {
          triggers = [];
        }
      }

      const match = triggers.find((t: any) => {
        // Normalize whitespace (e.g. "Manager  Change Flow" → "manager change flow")
        const normalize = (s: string) =>
          s.replace(/\s+/g, " ").trim().toLowerCase();
        const actionName = normalize(
          t?.data_obj?.name_of_action || t?.name_of_action || "",
        );
        const btnLabel = normalize(
          t?.button_label || t?.data_obj?.button_label || "",
        );
        const funnel = normalize(t?.funnel_name || "");
        const name = (t?.name || "").toLowerCase();
        return (
          actionName.includes("manager change") ||
          btnLabel.includes("manager change") ||
          funnel.includes("manager change") ||
          name.includes("manager_change")
        );
      });

      if (!match?.name) {
        toast.error("Manager Change flow is not available for this employee.");
        return;
      }

      setSelectedReporteeForChange({
        name: reportee.name,
        employee_name: reportee.employee_name || reportee.name,
        definitionName: match.name,
      });
      setIsManagerChangeModalOpen(true);
    } catch (err) {
      console.error(
        "Could not fetch triggers list for manager change flow.",
        err,
      );
      toast.error("Failed to load Manager Change flow. Please try again.");
    } finally {
      setIsLoadingTriggerForEmployee(null);
    }
  };

  const handleConfirmManagerChange = async () => {
    if (!selectedReporteeForChange) return;

    const definitionName = selectedReporteeForChange.definitionName;
    if (!definitionName) {
      toast.error(
        "Manager Change flow definition is missing. Please try again.",
      );
      return;
    }

    try {
      const result = await initiateFlow({
        document_name: selectedReporteeForChange.name,
        definition_name: definitionName,
      });

      setIsManagerChangeModalOpen(false);
      const reporteeDisplayName =
        selectedReporteeForChange.employee_name ||
        selectedReporteeForChange.name;
      setSelectedReporteeForChange(null);

      if (
        typeof window !== "undefined" &&
        typeof window.trigger_chatnext_assistant === "function"
      ) {
        window.trigger_chatnext_assistant(true, result?.session);
      } else {
        toast.success(
          `Manager Change Flow initiated for ${reporteeDisplayName}`,
        );
      }
    } catch (error) {
      console.error("Failed to initiate Manager Change Flow:", error);
      toast.error(
        errorResponseFormater(error, "Failed to initiate Manager Change Flow."),
      );
      setIsManagerChangeModalOpen(false);
    }
  };

  const reportingManagerName =
    supportContacts?.manager?.name && supportContacts.manager.name !== "N/A"
      ? supportContacts.manager.name
      : currentEmployee?.reports_to || "Reporting Manager";

  // 4. Actionables for you (Pending Attendance Requests, Leave Requests, and Expense Claims)
  const {
    attendanceCount,
    leaveCount,
    expenseCount,
    isLoading: isLoadingActionables,
    isError: isActionablesError,
    refetch: refetchActionables,
  } = useMyPendingTaskCounts(effectiveEmployeeId, hasSeparation);

  // 5. Open Items (Live Open Tasks, Attendance Flags, & Expenses Due)
  const {
    data: openItemsData,
    isLoading: isLoadingOpenItems,
    isError: isOpenItemsError,
    refetch: refetchOpenItems,
  } = useGetSeparationOpenItems(effectiveEmployeeId, hasSeparation);

  const openTasksCount = openItemsData?.open_tasks?.open_tasks ?? 0;
  const attendanceFlagsCount =
    openItemsData?.attendance_flags?.total_flags ?? 0;
  const expenseTotalAmount = openItemsData?.expenses?.total_amount ?? 0;
  const expenseTotalClaims = openItemsData?.expenses?.total_claims ?? 0;

  const openItems = useMemo(
    () => [
      {
        count: String(openTasksCount),
        label: "Open tasks",
        sublabel: openTasksCount === 0 ? "All tasks clear" : "To review",
        type: "tasks" as const,
      },
      {
        count: String(attendanceFlagsCount),
        label: "Attendance flags",
        sublabel:
          attendanceFlagsCount === 0
            ? "No flags this month"
            : "To review with HR",
        type: "attendance" as const,
      },
      {
        count: formatCurrency(expenseTotalAmount),
        label: "Expense due",
        sublabel:
          expenseTotalClaims === 0
            ? "No pending claims"
            : `${expenseTotalClaims} claim${expenseTotalClaims > 1 ? "s" : ""} pending approval`,
        type: "expenses" as const,
      },
    ],
    [
      openTasksCount,
      attendanceFlagsCount,
      expenseTotalAmount,
      expenseTotalClaims,
    ],
  );

  // 6. Clearance Department Status (Separation Workflow Stages from API)
  const {
    data: workflowStagesData,
    isLoading: isLoadingStages,
    isError: isStagesError,
    refetch: refetchStages,
  } = useGetSeparationWorkflowStages(effectiveEmployeeId, hasSeparation);

  const workflowStages = workflowStagesData?.workflow_stages || [];

  // 7. Full and Final Settlement Estimate
  const {
    data: fnfEstimate,
    isLoading: isLoadingFnf,
    isError: isFnfError,
    error: fnfError,
    refetch: refetchFnf,
  } = useGetFullAndFinalEstimate(effectiveEmployeeId, hasSeparation);

  const [isEarningsExpanded, setIsEarningsExpanded] = useState<boolean>(true);
  const [isDeductionsExpanded, setIsDeductionsExpanded] =
    useState<boolean>(true);

  // 7. People & Support (reports_to, custom_hrbp, custom_hd_team for target/current employee)
  const peopleList = useMemo(
    () => [
      {
        name: supportContacts?.hrbp?.name || "N/A",
        role: "HR Business Partner",
        description: "Separation Buddy & Exit Coordinator",
        email: supportContacts?.hrbp?.email || "",
      },
      {
        name: supportContacts?.manager?.name || "N/A",
        role: "Reporting Manager",
        description: "Handover & Separation Approval",
        email: supportContacts?.manager?.email || "",
      },
      {
        name: "Karan Mehta",
        role: "Offboarding team, IT and assets · ID OPS10221",
        description: "Asset pickup",
        email: "dummy@gmail.com",
      },
      {
        name: "Simran Kaur",
        role: "Offboarding team, finance and FnF · ID FIN10765",
        description: "Settlement queries",
        email: "dummy@gmail.com",
      },
      {
        name: supportContacts?.hdTeam?.name || "N/A",
        role: "Helpdesk Support Team",
        description: "For FnF, PF, gratuity and document queries after exit",
        email: supportContacts?.hdTeam?.email || "",
      },
    ],
    [supportContacts],
  );

  return (
    <div className="w-full p-3.5 sm:p-4 md:p-6 space-y-4 sm:space-y-5">
      {/* Top Header - Matching Other App Pages */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3 mb-1">
        <div className="flex flex-col">
          <Typography variant="h4">Exit Page</Typography>
          <Typography variant="bodySmall" color="body2">
            Track notice period progress, asset clearances, and full &amp; final
            settlement.
          </Typography>
        </div>
      </div>

      {/* Hero Card: Employee & Days Remaining */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
          {/* Employee Info */}
          <div className="flex items-center gap-3 sm:gap-3.5">
            <Avatar
              src={effectiveEmployee?.image || extendedEmp?.image || undefined}
              name={employeeName}
              size="h-11 w-11 sm:h-12 sm:w-12"
              fontSize="text-sm sm:text-base"
              avatarBgColor="bg-primary-50"
              avatarTextColor="text-primary-800"
            />
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <WrapperHoverCard employeeId={effectiveEmployeeId}>
                  <span className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity">
                    <Typography
                      variant="body"
                      className="font-bold text-gray-900"
                    >
                      {employeeName}
                    </Typography>
                    {effectiveEmployeeId && (
                      <Typography
                        variant="caption"
                        className="font-semibold text-gray-500"
                      >
                        ({effectiveEmployeeId})
                      </Typography>
                    )}
                  </span>
                </WrapperHoverCard>
                {hasSeparation ? (
                  isRejectedWorkflow ? (
                    <Typography
                      variant="caption"
                      className="inline-flex items-center px-2 py-0.5 rounded-lg font-bold bg-rose-50 text-rose-900 border border-rose-300"
                    >
                      Separation Rejected
                    </Typography>
                  ) : (
                    <Typography
                      variant="caption"
                      className="inline-flex items-center px-2 py-0.5 rounded-lg font-bold bg-amber-50 text-amber-900 border border-amber-300"
                    >
                      Notice Period
                    </Typography>
                  )
                ) : (
                  <Typography
                    variant="caption"
                    className="inline-flex items-center px-2 py-0.5 rounded-lg font-bold bg-emerald-50 text-emerald-900 border border-emerald-300"
                  >
                    Active
                  </Typography>
                )}
              </div>
              <Typography
                variant="bodySmall"
                className="font-semibold text-gray-700 mt-0.5 block"
              >
                {employeeDesignation}
                {employeeDepartment !== "N/A" && ` • ${employeeDepartment}`}
              </Typography>
              {employeeCompany !== "N/A" && (
                <Typography
                  variant="caption"
                  className="text-gray-500 mt-0.5 block"
                >
                  {employeeCompany}
                </Typography>
              )}
            </div>
          </div>

          {/* Days Remaining Counter - Only when separation is active */}
          {hasSeparation && !isRejectedWorkflow && (
            <div className="flex items-start md:items-end flex-col bg-gray-50 md:bg-transparent p-3 sm:p-3.5 md:p-0 rounded-xl border border-gray-100 md:border-0 shrink-0">
              <div className="flex items-baseline gap-1.5">
                <Typography
                  variant="h2"
                  className="font-extrabold text-gray-900 tracking-tight leading-none text-2xl sm:text-3xl"
                >
                  {daysRemaining !== null ? daysRemaining : "—"}
                </Typography>
                <Typography
                  variant="caption"
                  className="font-bold text-gray-600 uppercase"
                >
                  Days Left
                </Typography>
              </div>
              <Typography
                variant="caption"
                className="text-gray-600 font-medium mt-1"
              >
                Last working day is{" "}
                <strong className="text-gray-900 font-bold">
                  {relievingDate
                    ? formatToIndianDate(relievingDate)
                    : "Not specified"}
                </strong>
              </Typography>
            </div>
          )}
        </div>

        {/* Stepper Timeline (Active Separation) or Not Started Banner */}
        {isLoadingFunnel ? (
          <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="h-14 bg-gray-50 rounded-xl animate-pulse" />
          </div>
        ) : hasSeparation ? (
          <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-100">
            <Typography
              variant="caption"
              className="font-bold text-gray-800  tracking-wider block mb-3"
            >
              Separation Approval Timeline
            </Typography>
            <div className="flex items-center w-full overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {timelineSteps.map((step, idx) => {
                const isCompleted = step.status === "completed";
                const isActive = step.status === "active";
                const isPending = step.status === "pending";
                const isRejected = step.status === "rejected";
                const isInactive = step.status === "inactive";
                const isLast = idx === timelineSteps.length - 1;
                const nextStep = timelineSteps[idx + 1];

                return (
                  <React.Fragment key={`${step.label}-${idx}`}>
                    <div className="flex flex-col items-center group relative shrink-0 sm:shrink">
                      <div
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${
                          isRejected
                            ? "bg-rose-600 text-white ring-4 ring-rose-100"
                            : isCompleted
                              ? "bg-primary-700 text-white"
                              : isActive
                                ? "bg-amber-500 text-white ring-4 ring-amber-100"
                                : isPending
                                  ? "bg-amber-50 border-2 border-amber-400 text-amber-900"
                                  : isInactive
                                    ? "bg-gray-100 border border-gray-300 text-gray-400"
                                    : "bg-white border-2 border-gray-300 text-gray-500"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <Typography
                        variant="caption"
                        className={`mt-1.5 whitespace-nowrap text-center text-[11px] sm:text-xs hidden sm:block ${
                          isRejected
                            ? "text-rose-700 font-bold"
                            : isActive
                              ? "text-amber-900 font-bold"
                              : isPending
                                ? "text-amber-800 font-medium"
                                : isCompleted
                                  ? "text-gray-800 font-semibold"
                                  : isInactive
                                    ? "text-gray-400 font-medium opacity-70"
                                    : "text-gray-400 font-medium"
                        }`}
                      >
                        {step.label}
                        {isRejected ? (
                          <span className="block text-[10px] text-rose-600 font-medium">
                            (Rejected)
                          </span>
                        ) : isActive ? (
                          <span className="block text-[10px] text-amber-700 font-semibold">
                            (In Progress)
                          </span>
                        ) : isPending ? (
                          <span className="block text-[10px] text-amber-600 font-normal">
                            (Pending)
                          </span>
                        ) : isInactive ? (
                          <span className="block text-[10px] text-gray-400 font-normal">
                            (Inactive)
                          </span>
                        ) : null}
                      </Typography>
                    </div>

                    {!isLast && (
                      <div
                        className={`flex-1 h-[2px] mx-1 min-w-[12px] sm:min-w-[24px] transition-colors ${
                          isCompleted && nextStep?.status === "rejected"
                            ? "bg-rose-500"
                            : isCompleted && nextStep?.status === "completed"
                              ? "bg-primary-700"
                              : isCompleted &&
                                  (nextStep?.status === "active" ||
                                    nextStep?.status === "pending")
                                ? "bg-amber-400"
                                : (isActive || isPending) &&
                                    (nextStep?.status === "pending" ||
                                      nextStep?.status === "active")
                                  ? "bg-amber-200 border-t border-dashed border-amber-300"
                                  : isRejected ||
                                      isInactive ||
                                      timelineSteps
                                        .slice(0, idx + 1)
                                        .some(
                                          (s) =>
                                            s.status === "rejected" ||
                                            s.status === "inactive",
                                        )
                                    ? "bg-gray-200 border-t border-dashed border-gray-300"
                                    : isCompleted
                                      ? "bg-primary-700"
                                      : "bg-gray-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {isRejectedWorkflow ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3.5 bg-rose-50 border border-rose-200 px-3 py-2.5 rounded-lg text-xs text-rose-950 font-medium">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-rose-950"
                  >
                    {statusDescription}
                  </Typography>
                </div>
                <ViewAll
                  to={ROUTES.SEPARATION}
                  title="Go to Separation"
                  className="shrink-0 text-xs text-rose-700 hover:text-rose-900 font-semibold"
                />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3.5 bg-amber-50/90 border border-amber-200 px-3 py-2.5 rounded-lg text-xs text-amber-950 font-medium">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                  <Typography
                    variant="bodySmall"
                    className="font-medium text-amber-950"
                  >
                    {statusDescription}
                  </Typography>
                </div>
                <ViewAll
                  to={ROUTES.SEPARATION}
                  title="View Separation Process"
                  className="shrink-0 text-xs text-amber-800 hover:text-amber-950 font-semibold"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/90 border border-gray-200 rounded-xl p-3 sm:p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <Typography
                    variant="bodySmall"
                    className="font-bold text-gray-900 block"
                  >
                    Your separation process has not started yet
                  </Typography>
                  <Typography
                    variant="caption"
                    className="text-gray-500 font-medium mt-0.5 block"
                  >
                    When a separation request is initiated, approval stages,
                    notice period timeline, and exit milestones will appear
                    here.
                  </Typography>
                </div>
              </div>
              <ViewAll
                to={ROUTES.SEPARATION}
                title="Initiate Separation"
                className="shrink-0 text-xs text-primary-700 hover:text-primary-900 font-semibold"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid: 2 Columns - Only shown when separation is initiated */}
      {!isLoadingFunnel && hasSeparation && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* Left Column (7 cols) */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            {/* Full and Final Settlement (FnF) */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs transition-all">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 mb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <Typography
                      variant="subheading"
                      className="text-gray-900 block font-bold"
                    >
                      Full and Final Settlement, Estimated
                    </Typography>
                    <Typography
                      variant="caption"
                      className="text-gray-500 font-medium block"
                    >
                      Subject to final clearances, leave reconciliation, and
                      asset recovery
                    </Typography>
                  </div>
                </div>

                {fnfEstimate?.final?.direction && (
                  <div className="shrink-0 self-start sm:self-auto">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold border ${
                        fnfEstimate.final.is_recoverable
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {fnfEstimate.final.direction}
                    </span>
                  </div>
                )}
              </div>

              {/* Content States: Loading, Error, Empty, or Populated */}
              {isLoadingFnf ? (
                <div className="py-2">
                  <TableSkeleton columns={2} rows={4} />
                </div>
              ) : isFnfError ? (
                <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-rose-600" />
                  </div>
                  <Typography
                    variant="bodySmall"
                    className="text-gray-900 font-bold mb-1 block"
                  >
                    Unable to load settlement estimate
                  </Typography>
                  <div className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
                    {errorResponseFormater(
                      fnfError,
                      "The settlement calculation could not be retrieved. Please check your connection or try again.",
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchFnf()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : !fnfEstimate ||
                (!fnfEstimate.earnings?.length &&
                  !fnfEstimate.deductions?.length &&
                  !fnfEstimate.totals?.total_earnings &&
                  !fnfEstimate.totals?.net_settlement) ? (
                <div className="py-4">
                  <NoDataFound
                    title="No Settlement Estimate Available"
                    subtitle="Settlement calculation has not been computed or is unavailable for this employee."
                    onClick={() => refetchFnf()}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Period & Days Ribbon */}
                  {fnfEstimate.period && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>Period:</span>
                        <strong className="text-gray-900 font-semibold">
                          {fnfEstimate.period.start_date
                            ? formatToIndianDate(fnfEstimate.period.start_date)
                            : "N/A"}{" "}
                          &ndash;{" "}
                          {fnfEstimate.period.end_date
                            ? formatToIndianDate(fnfEstimate.period.end_date)
                            : "N/A"}
                        </strong>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <span>
                          Pay Days:{" "}
                          <strong className="text-gray-900 font-semibold">
                            {fnfEstimate.days?.payment_days ?? 0} of{" "}
                            {fnfEstimate.days?.working_days ?? 0}
                          </strong>
                        </span>
                        {Boolean(
                          fnfEstimate.days?.recovery_days &&
                          fnfEstimate.days.recovery_days > 0,
                        ) && (
                          <span className="text-rose-600 font-medium">
                            Recovery: {fnfEstimate.days.recovery_days} days
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Earnings Collapsible Section */}
                  <div className="rounded-lg border border-gray-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsEarningsExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50/80 hover:bg-gray-100/70 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <Typography
                          variant="bodySmall"
                          className="font-bold text-gray-900"
                        >
                          Earnings &amp; Additions
                        </Typography>
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-xl border border-emerald-200">
                          +
                          {formatCurrency(
                            fnfEstimate.totals?.total_earnings ||
                              fnfEstimate.final?.payable_breakup
                                ?.salary_earnings ||
                              0,
                          )}
                        </span>
                      </div>
                      {isEarningsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {isEarningsExpanded && (
                      <div className="divide-y divide-gray-100 px-3 text-xs bg-white">
                        {fnfEstimate.earnings?.map((earning, idx) => (
                          <div
                            key={`earning-${earning.salary_component}-${idx}`}
                            className="py-2 flex items-center justify-between gap-4"
                          >
                            <Typography
                              variant="bodySmall"
                              className="text-gray-800 font-medium"
                            >
                              {earning.salary_component}
                            </Typography>
                            <Typography
                              variant="bodySmall"
                              className="font-semibold text-gray-900 shrink-0"
                            >
                              {formatCurrency(earning.amount)}
                            </Typography>
                          </div>
                        ))}

                        {/* Optional Leave Encashment */}
                        {Boolean(
                          fnfEstimate.leave_encashment &&
                          fnfEstimate.leave_encashment.total_amount > 0,
                        ) && (
                          <div className="py-2 flex items-center justify-between gap-4">
                            <div>
                              <Typography
                                variant="bodySmall"
                                className="text-gray-800 font-medium"
                              >
                                Leave Encashment
                              </Typography>
                              {Boolean(
                                fnfEstimate.leave_encashment?.total_days &&
                                fnfEstimate.leave_encashment.total_days > 0,
                              ) && (
                                <Typography
                                  variant="caption"
                                  className="text-gray-500 mt-0.5 block"
                                >
                                  {fnfEstimate.leave_encashment?.total_days}{" "}
                                  days encashed
                                </Typography>
                              )}
                            </div>
                            <Typography
                              variant="bodySmall"
                              className="font-semibold text-emerald-700 shrink-0"
                            >
                              +
                              {formatCurrency(
                                fnfEstimate.leave_encashment?.total_amount || 0,
                              )}
                            </Typography>
                          </div>
                        )}

                        {/* Pay Days Arrear if any */}
                        {Boolean(
                          fnfEstimate.totals?.pay_days_arrear &&
                          fnfEstimate.totals.pay_days_arrear > 0,
                        ) && (
                          <div className="py-2 flex items-center justify-between gap-4">
                            <Typography
                              variant="bodySmall"
                              className="text-gray-800 font-medium"
                            >
                              Pay Days Arrear
                            </Typography>
                            <Typography
                              variant="bodySmall"
                              className="font-semibold text-gray-900 shrink-0"
                            >
                              {formatCurrency(
                                fnfEstimate.totals.pay_days_arrear,
                              )}
                            </Typography>
                          </div>
                        )}

                        {(!fnfEstimate.earnings ||
                          fnfEstimate.earnings.length === 0) && (
                          <div className="py-2.5 text-center text-gray-500">
                            No earnings recorded for this period
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Deductions Collapsible Section */}
                  <div className="rounded-lg border border-gray-100 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsDeductionsExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50/80 hover:bg-gray-100/70 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <Typography
                          variant="bodySmall"
                          className="font-bold text-gray-900"
                        >
                          Deductions &amp; Recoveries
                        </Typography>
                        <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-xl border border-rose-200">
                          &minus;
                          {formatCurrency(
                            fnfEstimate.totals?.total_deductions ||
                              fnfEstimate.final?.receivable_breakup
                                ?.salary_deductions ||
                              0,
                          )}
                        </span>
                      </div>
                      {isDeductionsExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {isDeductionsExpanded && (
                      <div className="divide-y divide-gray-100 px-3 text-xs bg-white">
                        {fnfEstimate.deductions?.map((deduction, idx) => (
                          <div
                            key={`deduction-${deduction.salary_component}-${idx}`}
                            className="py-2 flex items-center justify-between gap-4"
                          >
                            <Typography
                              variant="bodySmall"
                              className="text-gray-800 font-medium"
                            >
                              {deduction.salary_component}
                            </Typography>
                            <Typography
                              variant="bodySmall"
                              className="font-semibold text-rose-700 shrink-0"
                            >
                              &minus;
                              {formatCurrency(Math.abs(deduction.amount))}
                            </Typography>
                          </div>
                        ))}

                        {/* Asset Recovery if any */}
                        {Boolean(
                          fnfEstimate.totals?.asset_recovery &&
                          fnfEstimate.totals.asset_recovery > 0,
                        ) && (
                          <div className="py-2 flex items-center justify-between gap-4">
                            <Typography
                              variant="bodySmall"
                              className="text-gray-800 font-medium"
                            >
                              Asset Recovery
                            </Typography>
                            <Typography
                              variant="bodySmall"
                              className="font-semibold text-rose-700 shrink-0"
                            >
                              &minus;
                              {formatCurrency(
                                fnfEstimate.totals.asset_recovery,
                              )}
                            </Typography>
                          </div>
                        )}

                        {/* Extra Recovery if any */}
                        {Boolean(
                          fnfEstimate.totals?.extra_recovery_deduction &&
                          fnfEstimate.totals.extra_recovery_deduction > 0,
                        ) && (
                          <div className="py-2 flex items-center justify-between gap-4">
                            <Typography
                              variant="bodySmall"
                              className="text-gray-800 font-medium"
                            >
                              Other Deductions / Recovery
                            </Typography>
                            <Typography
                              variant="bodySmall"
                              className="font-semibold text-rose-700 shrink-0"
                            >
                              &minus;
                              {formatCurrency(
                                fnfEstimate.totals.extra_recovery_deduction,
                              )}
                            </Typography>
                          </div>
                        )}

                        {(!fnfEstimate.deductions ||
                          fnfEstimate.deductions.length === 0) && (
                          <div className="py-2.5 text-center text-gray-500">
                            No deductions recorded for this period
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Subtotals & Net Estimated Amount Card */}
                  <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-gradient-to-br from-primary-50/60 to-gray-50 border border-primary-100">
                    <div className="space-y-1.5 pb-3 border-b border-primary-100/70 text-xs">
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Gross Payable Earnings:</span>
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(
                            fnfEstimate.totals?.total_earnings ||
                              fnfEstimate.final?.total_payable ||
                              0,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Total Deductions &amp; Recoveries:</span>
                        <span className="font-semibold text-rose-700">
                          &minus;
                          {formatCurrency(
                            fnfEstimate.totals?.total_deductions ||
                              fnfEstimate.final?.total_receivable ||
                              0,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-between">
                      <div>
                        <Typography
                          variant="bodySmall"
                          className="font-bold text-gray-900 block"
                        >
                          Net Estimated Settlement
                        </Typography>
                        <Typography
                          variant="caption"
                          className="text-gray-500 font-medium block mt-0.5"
                        >
                          {fnfEstimate.final?.is_recoverable
                            ? "Recoverable amount from employee"
                            : "Payable to registered salary account"}
                        </Typography>
                      </div>
                      <Typography
                        variant="h4"
                        className={`font-extrabold text-xl sm:text-2xl ${
                          fnfEstimate.final?.is_recoverable
                            ? "text-rose-700"
                            : "text-primary-800"
                        }`}
                      >
                        {formatCurrency(
                          fnfEstimate.totals?.net_settlement ??
                            fnfEstimate.final?.net_pay ??
                            0,
                        )}
                      </Typography>
                    </div>

                    {fnfEstimate.final?.amount_in_words && (
                      <div className="mt-2.5 pt-2 border-t border-primary-100/60">
                        <Typography
                          variant="caption"
                          className="text-gray-600 italic font-medium block"
                        >
                          In words: {fnfEstimate.final.amount_in_words}
                        </Typography>
                      </div>
                    )}
                  </div>

                  {/* Disclaimer */}
                  <Typography
                    variant="caption"
                    className="text-gray-600 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200 block"
                  >
                    This is an estimated settlement statement and is subject to
                    revision based on final department clearances, asset
                    clearance, and attendance reconciliation. Expected payout is
                    within 45 days of the relieving date.
                  </Typography>
                </div>
              )}
            </div>

            {/* Clearance Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <Typography variant="subheading" className="text-gray-900">
                    Clearance Department Status
                  </Typography>
                </div>
                {workflowStages.length > 0 && (
                  <Typography
                    variant="caption"
                    className="text-gray-500 font-semibold"
                  >
                    {workflowStagesData?.cleared_stages ??
                      workflowStages.filter(
                        (s) =>
                          s.is_cleared ||
                          s.status === "Cleared" ||
                          s.status === "Approved" ||
                          s.status === "Completed",
                      ).length}{" "}
                    of{" "}
                    {workflowStagesData?.total_stages ?? workflowStages.length}{" "}
                    cleared
                  </Typography>
                )}
              </div>

              {isLoadingStages ? (
                <div className="py-2">
                  <TableSkeleton columns={2} rows={3} />
                </div>
              ) : isStagesError ? (
                <div className="py-4 text-center">
                  <Typography
                    variant="caption"
                    className="text-rose-600 font-medium mb-2 block"
                  >
                    Failed to load clearance department stages
                  </Typography>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchStages()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : workflowStages.length === 0 ? (
                <div className="py-2">
                  <NoDataFound
                    title="No Clearance Stages Found"
                    subtitle="No department clearance stages available for this employee."
                  />
                </div>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {workflowStages.map((stage, i) => {
                    const isCleared =
                      stage.is_cleared ||
                      stage.status === "Cleared" ||
                      stage.status === "Approved" ||
                      stage.status === "Completed";
                    const isCancelled =
                      stage.is_cancelled || stage.status === "Cancelled";
                    const isInProgress = stage.status === "In Progress";

                    const assignedInfo =
                      stage.assigned_users && stage.assigned_users.length > 0
                        ? stage.assigned_users
                            .map((u) => u.name || u.user_id)
                            .filter(Boolean)
                            .join(", ")
                        : stage.assigned_roles &&
                            stage.assigned_roles.length > 0
                          ? stage.assigned_roles.join(", ")
                          : stage.description || "Clearance required";

                    return (
                      <div
                        key={stage.todo || stage.funnel_task || i}
                        className="py-3 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5">
                            {getStageIcon(stage.stage_name)}
                          </div>
                          <div>
                            <Typography
                              variant="bodySmall"
                              className="font-bold text-gray-900 block"
                            >
                              {stage.stage_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              className="text-gray-500 font-medium mt-0.5 block"
                            >
                              {assignedInfo}
                            </Typography>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isCleared
                                ? "bg-emerald-600"
                                : isCancelled
                                  ? "bg-rose-500"
                                  : isInProgress
                                    ? "bg-primary-600"
                                    : "bg-amber-500"
                            }`}
                          />
                          <Typography
                            variant="caption"
                            className={`font-bold ${
                              isCleared
                                ? "text-emerald-800"
                                : isCancelled
                                  ? "text-rose-800"
                                  : isInProgress
                                    ? "text-primary-800"
                                    : "text-amber-800"
                            }`}
                          >
                            {isCleared
                              ? "Cleared"
                              : isCancelled
                                ? "Cancelled"
                                : stage.status || "Pending"}
                          </Typography>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Your Reportees */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-2 border-b border-gray-100">
                <div className="p-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <Typography
                    variant="subheading"
                    className="text-gray-900 block"
                  >
                    Your Reportees
                  </Typography>
                  <Typography
                    variant="caption"
                    className="text-gray-500 font-medium block"
                  >
                    Handover and manager reassignment
                  </Typography>
                </div>
              </div>

              {isLoadingReportees ? (
                <div className="py-2">
                  <TableSkeleton columns={2} rows={3} />
                </div>
              ) : isReporteesError ? (
                <div className="py-4 text-center">
                  <Typography
                    variant="caption"
                    className="text-rose-600 font-medium mb-2 block"
                  >
                    Failed to load reportees
                  </Typography>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchReportees()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : reportees.length === 0 ? (
                <div className="py-2">
                  <NoDataFound
                    title="No Reportees Found"
                    subtitle="No active direct reportees assigned to this employee."
                  />
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-100 text-xs">
                    {reportees.map((r, i) => {
                      const repDesignation =
                        r.designation_name || r.custom_designation_title || "";
                      return (
                        <div
                          key={r.name || i}
                          className="py-2.5 flex items-center justify-between gap-4"
                        >
                          <WrapperHoverCard employeeId={r.name}>
                            <div className="cursor-pointer hover:opacity-80 transition-opacity">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Typography
                                  variant="bodySmall"
                                  className="font-bold text-gray-900"
                                >
                                  {r.employee_name || r.name}
                                </Typography>
                                {repDesignation && (
                                  <Typography
                                    variant="caption"
                                    className="text-gray-500 font-medium ml-1.5"
                                  >
                                    ({repDesignation})
                                  </Typography>
                                )}
                              </div>
                              <Typography
                                variant="caption"
                                className="text-gray-400 font-medium block mt-0.5"
                              >
                                reporting manager pending
                              </Typography>
                            </div>
                          </WrapperHoverCard>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <Typography
                              variant="caption"
                              className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200"
                            >
                              {r.status || "Active"}
                            </Typography>
                            <button
                              type="button"
                              disabled={isLoadingTriggerForEmployee === r.name}
                              onClick={() =>
                                handleOpenManagerChangeModal({
                                  name: r.name,
                                  employee_name: r.employee_name || r.name,
                                })
                              }
                              className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              {isLoadingTriggerForEmployee === r.name
                                ? "Loading..."
                                : "Change manager \u2192"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Typography
                    variant="caption"
                    className="text-primary-950 bg-primary-50/80 p-2.5 rounded-lg border border-primary-200 font-medium mt-3.5 block"
                  >
                    {`Recommended manager: ${reportingManagerName}, awaiting approval.`}
                  </Typography>
                </>
              )}
            </div>
          </div>

          {/* Right Column (5 cols) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            {/* Open Items Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
              <Typography
                variant="subheading"
                className="text-gray-900 mb-3 block"
              >
                Open Items
              </Typography>
              {isLoadingOpenItems ? (
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-gray-50/90 p-2.5 sm:p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-center animate-pulse min-h-[84px]"
                    >
                      <div className="h-5 w-10 bg-gray-200 rounded mb-2" />
                      <div className="h-3 w-14 bg-gray-200 rounded mb-1" />
                      <div className="h-2 w-16 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : isOpenItemsError ? (
                <div className="py-3 text-center">
                  <Typography
                    variant="caption"
                    className="text-rose-600 font-medium mb-1.5 block"
                  >
                    Failed to load open items
                  </Typography>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchOpenItems()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-center">
                  {openItems.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={
                        item.type === "tasks" ? handleNavigateToTodo : undefined
                      }
                      className={`bg-gray-50/90 p-2.5 sm:p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-center ${
                        item.type === "tasks"
                          ? "cursor-pointer hover:bg-gray-100/80 transition-colors"
                          : ""
                      }`}
                    >
                      <Typography
                        variant={item.type === "expenses" ? "subheading" : "h3"}
                        className={`font-bold text-gray-900 leading-tight ${
                          item.type === "expenses"
                            ? "text-xs sm:text-sm md:text-base"
                            : "text-base sm:text-lg md:text-xl"
                        }`}
                      >
                        {item.count}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="font-bold text-gray-800 mt-1 sm:mt-1.5 block text-[11px] sm:text-xs"
                      >
                        {item.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="text-gray-500 font-medium leading-tight mt-0.5 block text-[10px] sm:text-xs"
                      >
                        {item.sublabel}
                      </Typography>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actionables for you Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
                <Typography
                  variant="subheading"
                  className="text-gray-900 block font-bold"
                >
                  Actionables for you
                </Typography>
                {isActionablesError && (
                  <button
                    type="button"
                    onClick={() => refetchActionables()}
                    className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline"
                  >
                    Retry
                  </button>
                )}
              </div>

              {isLoadingActionables ? (
                <div className="space-y-3 py-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="py-2.5 flex items-center justify-between gap-4 border-b border-gray-100 last:border-b-0 animate-pulse"
                    >
                      <div className="space-y-1.5 w-1/2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/4" />
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-28" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Attendance */}
                  <div className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-4">
                    <div>
                      <Typography
                        variant="bodySmall"
                        className="font-medium text-gray-900 block"
                      >
                        Attendance flags to review
                      </Typography>
                      <Typography
                        variant="caption"
                        className="text-gray-500 font-medium mt-0.5 block"
                      >
                        {attendanceCount}{" "}
                        {attendanceCount === 1 ? "flag" : "flags"}
                      </Typography>
                    </div>
                    <button
                      type="button"
                      onClick={handleNavigateToAttendance}
                      className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1 transition-colors shrink-0"
                    >
                      Review attendance &rarr;
                    </button>
                  </div>

                  {/* Leave */}
                  <div className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-4">
                    <div>
                      <Typography
                        variant="bodySmall"
                        className="font-medium text-gray-900 block"
                      >
                        Leave request pending approval
                      </Typography>
                      <Typography
                        variant="caption"
                        className="text-gray-500 font-medium mt-0.5 block"
                      >
                        {leaveCount} {leaveCount === 1 ? "request" : "requests"}
                      </Typography>
                    </div>
                    <button
                      type="button"
                      onClick={handleNavigateToLeave}
                      className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1 transition-colors shrink-0"
                    >
                      View leave request &rarr;
                    </button>
                  </div>

                  {/* Expense */}
                  <div className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-4">
                    <div>
                      <Typography
                        variant="bodySmall"
                        className="font-medium text-gray-900 block"
                      >
                        Expense claims due
                      </Typography>
                      <Typography
                        variant="caption"
                        className="text-gray-500 font-medium mt-0.5 block"
                      >
                        {expenseCount} {expenseCount === 1 ? "claim" : "claims"}
                      </Typography>
                    </div>
                    <button
                      type="button"
                      onClick={handleNavigateToExpenses}
                      className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1 transition-colors shrink-0"
                    >
                      File expenses &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Task Box Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                <div>
                  <Typography
                    variant="subheading"
                    className="text-gray-900 block font-bold"
                  >
                    Task box
                  </Typography>
                  <Typography
                    variant="caption"
                    className="text-gray-500 font-medium block mt-0.5"
                  >
                    Assigned to you &middot; {totalPendingTasks} pending, across{" "}
                    {todoCategories.length}{" "}
                    {todoCategories.length === 1 ? "category" : "categories"}
                  </Typography>
                </div>
                <button
                  type="button"
                  onClick={handleNavigateToTodo}
                  className="text-xs font-semibold text-primary-700 hover:text-primary-800 hover:underline flex items-center gap-1 transition-colors shrink-0 ml-2"
                >
                  View to-do &rarr;
                </button>
              </div>

              {isLoadingTodoCategories ? (
                <div className="space-y-2 py-1 min-h-[140px]">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-gray-50 animate-pulse flex items-center justify-between"
                    >
                      <div className="h-3.5 bg-gray-200 rounded w-1/3" />
                      <div className="h-5 w-7 bg-gray-200 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : sortedTodoCategories.length === 0 ? (
                <div className="py-2 min-h-[140px] flex items-center justify-center">
                  <NoDataFound
                    title="You're all caught up 🎉"
                    subtitle="No pending tasks assigned to you right now."
                  />
                </div>
              ) : (
                <div className="min-h-[140px] max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
                  {sortedTodoCategories.map((cat) => (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => handleCategoryClick(cat.name)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-primary-50/60 hover:border-primary-200/80 transition-all text-left group cursor-pointer"
                    >
                      <Typography
                        variant="bodySmall"
                        className="font-medium text-gray-800 group-hover:text-primary-700 transition-colors truncate"
                      >
                        {cat.name}
                      </Typography>

                      <span className="min-w-[24px] px-2.5 py-0.5 rounded-full text-xs font-semibold text-gray-600 bg-white border border-gray-200 group-hover:bg-primary-100 group-hover:text-primary-800 group-hover:border-primary-200 transition-colors text-center shrink-0">
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <Typography
                variant="caption"
                className="text-gray-500 font-medium mt-3 pt-2.5 border-t border-gray-100 block text-[11px] leading-relaxed"
              >
                These are tasks waiting on your action. Review and act on each
                one before your last working day.
              </Typography>
            </div>

            {/* People / Contacts */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
              <Typography
                variant="subheading"
                className="text-gray-900 mb-3 block"
              >
                People &amp; Support
              </Typography>
              <div className="space-y-2.5">
                {peopleList.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between gap-3 text-xs"
                  >
                    <div>
                      <Typography
                        variant="bodySmall"
                        className="font-bold text-gray-900 block"
                      >
                        {p.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="text-primary-800 font-semibold mt-0.5 block"
                      >
                        {p.role}
                      </Typography>
                      {p.description && (
                        <Typography
                          variant="caption"
                          className="text-gray-500 font-medium mt-0.5 block"
                        >
                          {p.description}
                        </Typography>
                      )}
                    </div>
                    {p.email && (
                      <a
                        href={`mailto:${p.email}`}
                        className="p-1.5 text-gray-500 hover:text-primary-700 hover:bg-white rounded-full transition-colors shrink-0"
                        title={p.email}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manager Change Confirmation Modal */}
      <ActionConfirmationModal
        isOpen={isManagerChangeModalOpen}
        title="Initiate Flow"
        message='Are you sure you want to initiate "Manager Change Flow"?'
        confirmLabel="Yes, Initiate"
        cancelLabel="Cancel"
        confirmBgColor="primary"
        isPending={isInitiatingFlow}
        onConfirm={handleConfirmManagerChange}
        onCancel={() => {
          setIsManagerChangeModalOpen(false);
          setSelectedReporteeForChange(null);
        }}
      />
    </div>
  );
};

export default ExitPage;
