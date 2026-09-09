import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FileText,
  Download,
  Users,
  Info,
  X,
  XCircle,
  ShieldCheck,
  Laptop,
  CreditCard,
  Building,
  Mail,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

import { DUMMY_SEPARATION_DATA } from "./separationDashboardData";
import { Typography } from "../../../shared/atoms/Typography";
import Button from "../../../shared/atoms/Button";
import { ViewAll } from "../../../shared/atoms/ViewAll";
import Avatar from "../../../shared/Avatar";
import NoDataFound from "../../../shared/atoms/NoDataFound";
import TableSkeleton from "../../../shared/molecules/Skeletons/TableSkeleton";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";
import { formatCurrency } from "../../../../utils/currency";
import { formatDateDDMonthYYYY } from "../../../../utils/formatToIndianDate";
import { differenceInCalendarDays } from "date-fns";
import { useTargetUser } from "../../../../context/ViewedUserContext";
import {
  useCurrentEmployeeDetails,
  useEmployee,
} from "../../../../hooks/useEmployee";
import { useActiveReportees } from "../../../../hooks/usePip";
import {
  useGetSeparationFunnelDetails,
  useEmployeeSupportContacts,
  useGetSeparationOpenItems,
  useGetSeparationWorkflowStages,
} from "../../../../hooks/useSeparation";
import { ROUTES } from "../../../../constants/routes";

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
  if (nameLower.includes("it") || nameLower.includes("asset") || nameLower.includes("laptop")) {
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

const SeparationDashboard: React.FC = () => {
  const data = DUMMY_SEPARATION_DATA;
  const [showPolicyModal, setShowPolicyModal] = useState<boolean>(false);

  // 1. Effective Employee Data
  const { isViewingOtherUser, targetEmployeeId } = useTargetUser();
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { data: targetEmployee } = useEmployee(
    isViewingOtherUser ? targetEmployeeId : null
  );

  const effectiveEmployee = isViewingOtherUser ? targetEmployee : currentEmployee;
  const effectiveEmployeeId = isViewingOtherUser
    ? targetEmployeeId || ""
    : currentEmployee?.name || "";

  const extendedEmp = effectiveEmployee as ExtendedEmployeeFields | undefined;

  const employeeName = effectiveEmployee?.employee_name || effectiveEmployee?.name || "N/A";
  const employeeDesignation =
    extendedEmp?.designation_name ||
    extendedEmp?.custom_designation_title ||
    "N/A";
  const employeeDepartment =
    effectiveEmployee?.department_name || "N/A";
  const employeeCompany =
    effectiveEmployee?.company_name || "N/A";

  // Support Contacts & Relieving Date (from Employee resource API)
  const { data: supportContacts } = useEmployeeSupportContacts(effectiveEmployeeId);

  // 2. Separation Funnel Details & Timeline Stages
  const { data: separationFunnelDetails } = useGetSeparationFunnelDetails();
  const funnelItem = separationFunnelDetails?.data?.[0];
  const extendedFunnel = funnelItem as ExtendedFunnelFields | undefined;

  const isRevoked =
    funnelItem?.approval_status === "Revoked" ||
    funnelItem?.approval_stages?.some(
      (stage) => stage?.todo?.reference_document?.custom_status === "Revoked"
    );
  const hasSeparation = !!funnelItem && !isRevoked;

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
          status: isOverallRejected ? ("rejected" as const) : ("completed" as const),
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
        (isOverallRejected && !foundFirstPending && (stage.status === "Pending" || !stage.status))
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
  } = useActiveReportees(effectiveEmployeeId);

  // 4. Open Items (Live Open Tasks, Attendance Flags, & Expenses Due)
  const {
    data: openItemsData,
    isLoading: isLoadingOpenItems,
    isError: isOpenItemsError,
    refetch: refetchOpenItems,
  } = useGetSeparationOpenItems(effectiveEmployeeId);

  const openTasksCount = openItemsData?.open_tasks?.open_tasks ?? 0;
  const attendanceFlagsCount = openItemsData?.attendance_flags?.total_flags ?? 0;
  const expenseTotalAmount = openItemsData?.expenses?.total_amount ?? 0;
  const expenseTotalClaims = openItemsData?.expenses?.total_claims ?? 0;

  const openItems = useMemo(
    () => [
      {
        count: String(openTasksCount),
        label: "Open tasks",
        sublabel:
          openTasksCount === 0
            ? "All tasks clear"
            : "To review",
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
    [openTasksCount, attendanceFlagsCount, expenseTotalAmount, expenseTotalClaims]
  );

  // 5. Clearance Department Status (Separation Workflow Stages from API)
  const {
    data: workflowStagesData,
    isLoading: isLoadingStages,
    isError: isStagesError,
    refetch: refetchStages,
  } = useGetSeparationWorkflowStages(effectiveEmployeeId);

  const workflowStages = workflowStagesData?.workflow_stages || [];

  // 6. People & Support (reports_to, custom_hrbp, custom_hd_team for target/current employee)
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
        name: supportContacts?.hdTeam?.name || "N/A",
        role: "Helpdesk Support Team",
        description: "For FnF, PF, gratuity and document queries after exit",
        email: supportContacts?.hdTeam?.email || "",
      },
    ],
    [supportContacts]
  );

  const handleDownloadChecklist = () => {
    toast.success("Downloading Exit & Handover Checklist (PDF)...");
  };

  return (
    <div className="w-full p-3.5 sm:p-4 md:p-6 space-y-4 sm:space-y-5">
      {/* Top Header - Matching Other App Pages */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3 mb-1">
        <div className="flex flex-col">
          <Typography variant="h4">Separation Dashboard</Typography>
          <Typography variant="bodySmall" color="body2">
            Track notice period progress, asset clearances, and full &amp; final settlement.
          </Typography>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="soft"
            size="sm"
            icon={<FileText className="w-4 h-4" />}
            onClick={() => setShowPolicyModal(true)}
            className="flex-1 sm:flex-initial"
          >
            Separation Policy
          </Button>
          <Button
            variant="contain"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleDownloadChecklist}
            className="flex-1 sm:flex-initial"
          >
            Exit Checklist
          </Button>
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
                    <Typography variant="body" className="font-bold text-gray-900">
                      {employeeName}
                    </Typography>
                    {effectiveEmployeeId && (
                      <Typography variant="caption" className="font-semibold text-gray-500">
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
              <Typography variant="bodySmall" className="font-semibold text-gray-700 mt-0.5 block">
                {employeeDesignation}
                {employeeDepartment !== "N/A" && ` • ${employeeDepartment}`}
              </Typography>
              {employeeCompany !== "N/A" && (
                <Typography variant="caption" className="text-gray-500 mt-0.5 block">
                  {employeeCompany}
                </Typography>
              )}
            </div>
          </div>

          {/* Days Remaining Counter - Only when separation is active */}
          {hasSeparation && !isRejectedWorkflow && (
            <div className="flex items-start md:items-end flex-col bg-gray-50 md:bg-transparent p-3 sm:p-3.5 md:p-0 rounded-xl border border-gray-100 md:border-0 shrink-0">
              <div className="flex items-baseline gap-1.5">
                <Typography variant="h2" className="font-extrabold text-gray-900 tracking-tight leading-none text-2xl sm:text-3xl">
                  {daysRemaining !== null ? daysRemaining : "—"}
                </Typography>
                <Typography variant="caption" className="font-bold text-gray-600 uppercase">
                  Days Left
                </Typography>
              </div>
              <Typography variant="caption" className="text-gray-600 font-medium mt-1">
                Last working day is{" "}
                <strong className="text-gray-900 font-bold">
                  {relievingDate ? formatDateDDMonthYYYY(relievingDate) : "Not specified"}
                </strong>
              </Typography>
            </div>
          )}
        </div>

        {/* Stepper Timeline (Active Separation) or Not Started Banner */}
        {hasSeparation ? (
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
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${isRejected
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
                        className={`mt-1.5 whitespace-nowrap text-center text-[11px] sm:text-xs hidden sm:block ${isRejected
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
                        className={`flex-1 h-[2px] mx-1 min-w-[12px] sm:min-w-[24px] transition-colors ${isCompleted && nextStep?.status === "rejected"
                          ? "bg-rose-500"
                          : isCompleted && nextStep?.status === "completed"
                            ? "bg-primary-700"
                            : isCompleted && (nextStep?.status === "active" || nextStep?.status === "pending")
                              ? "bg-amber-400"
                              : (isActive || isPending) && (nextStep?.status === "pending" || nextStep?.status === "active")
                                ? "bg-amber-200 border-t border-dashed border-amber-300"
                                : isRejected || isInactive || timelineSteps.slice(0, idx + 1).some((s) => s.status === "rejected" || s.status === "inactive")
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
                  <Typography variant="bodySmall" className="font-medium text-rose-950">
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
                  <Typography variant="bodySmall" className="font-medium text-amber-950">
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
                  <Typography variant="bodySmall" className="font-bold text-gray-900 block">
                    Your separation process has not started yet
                  </Typography>
                  <Typography variant="caption" className="text-gray-500 font-medium mt-0.5 block">
                    When a separation request is initiated, approval stages, notice period timeline, and exit milestones will appear here.
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

      {/* Main Content Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-5">
          {/* Full and Final Settlement (FnF) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <Typography variant="subheading" className="text-gray-900 block">
                    Full and Final Settlement, Estimated
                  </Typography>
                  <Typography variant="caption" className="text-gray-500 font-medium block">
                    Subject to final clearances and leave reconciliation
                  </Typography>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              {data.fnfSettlement.items.map((item, i) => (
                <div key={i} className="py-2.5 flex items-start justify-between gap-4">
                  <div>
                    <Typography variant="bodySmall" className="font-semibold text-gray-900 block">
                      {item.label}
                    </Typography>
                    {item.subtitle && (
                      <Typography variant="caption" className="text-gray-500 font-medium mt-0.5 block">
                        {item.subtitle}
                      </Typography>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {item.type === "info" ? (
                      <Typography variant="caption" className="text-gray-700 font-semibold bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 inline-block">
                        {item.note || "Served"}
                      </Typography>
                    ) : item.type === "deduction" ? (
                      <Typography variant="bodySmall" className="font-semibold text-rose-700">
                        &minus;{formatCurrency(Math.abs(item.amount || 0))}
                      </Typography>
                    ) : (
                      <Typography variant="bodySmall" className="font-semibold text-gray-900">
                        {formatCurrency(item.amount || 0)}
                      </Typography>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Net Amount */}
            <div className="mt-3.5 pt-3 border-t-2 border-gray-900 flex items-center justify-between">
              <div>
                <Typography variant="bodySmall" className="font-bold text-gray-900 block">
                  Net Estimated Amount
                </Typography>
                <Typography variant="caption" className="text-gray-500 font-medium block">
                  Payable to registered salary account
                </Typography>
              </div>
              <Typography variant="h4" className="font-bold text-primary-800 text-lg sm:text-xl">
                {formatCurrency(data.fnfSettlement.netEstimatedAmount)}
              </Typography>
            </div>

            <Typography variant="caption" className="text-gray-600 font-medium leading-relaxed mt-3.5 bg-gray-50 p-3 rounded-lg border border-gray-200 block">
              {data.fnfSettlement.disclaimer}
            </Typography>
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
                <Typography variant="caption" className="text-gray-500 font-semibold">
                  {workflowStagesData?.cleared_stages ??
                    workflowStages.filter(
                      (s) =>
                        s.is_cleared ||
                        s.status === "Cleared" ||
                        s.status === "Approved" ||
                        s.status === "Completed"
                    ).length}{" "}
                  of {workflowStagesData?.total_stages ?? workflowStages.length} cleared
                </Typography>
              )}
            </div>

            {isLoadingStages ? (
              <div className="py-2">
                <TableSkeleton columns={2} rows={3} />
              </div>
            ) : isStagesError ? (
              <div className="py-4 text-center">
                <Typography variant="caption" className="text-rose-600 font-medium mb-2 block">
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
                      : stage.assigned_roles && stage.assigned_roles.length > 0
                        ? stage.assigned_roles.join(", ")
                        : stage.description || "Clearance required";

                  return (
                    <div
                      key={stage.todo || stage.funnel_task || i}
                      className="py-3 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">{getStageIcon(stage.stage_name)}</div>
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
                          className={`w-2 h-2 rounded-full ${isCleared
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
                          className={`font-bold ${isCleared
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
                <Typography variant="subheading" className="text-gray-900 block">
                  Your Reportees
                </Typography>
                <Typography variant="caption" className="text-gray-500 font-medium block">
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
                <Typography variant="caption" className="text-rose-600 font-medium mb-2 block">
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
                      r.designation_name ||
                      r.custom_designation_title ||
                      "";
                    return (
                      <div
                        key={r.name || i}
                        className="py-2.5 flex items-center justify-between gap-4"
                      >
                        <WrapperHoverCard employeeId={r.name}>
                          <div className="cursor-pointer hover:opacity-80 transition-opacity">
                            <Typography variant="bodySmall" className="font-bold text-gray-900">
                              {r.employee_name || r.name}
                            </Typography>
                            {repDesignation && (
                              <Typography variant="caption" className="text-gray-500 font-medium ml-1.5">
                                ({repDesignation})
                              </Typography>
                            )}
                          </div>
                        </WrapperHoverCard>
                        <Typography variant="caption" className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                          {r.status || "Active"}
                        </Typography>
                      </div>
                    );
                  })}
                </div>

                <Typography variant="caption" className="text-primary-950 bg-primary-50/80 p-2.5 rounded-lg border border-primary-200 font-medium mt-3.5 block">
                  {data.recommendedManagerNotice}
                </Typography>
              </>
            )}
          </div>
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-5">
          {/* Open Items Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
            <Typography variant="subheading" className="text-gray-900 mb-3 block">
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
                <Typography variant="caption" className="text-rose-600 font-medium mb-1.5 block">
                  Failed to load open items
                </Typography>
                <Button variant="outline" size="sm" onClick={() => refetchOpenItems()}>
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5 text-center">
                {openItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50/90 p-2.5 sm:p-3 rounded-xl border border-gray-200 flex flex-col items-center justify-center"
                  >
                    <Typography
                      variant={item.type === "expenses" ? "subheading" : "h3"}
                      className={`font-bold text-gray-900 leading-tight ${item.type === "expenses" ? "text-xs sm:text-sm md:text-base" : "text-base sm:text-lg md:text-xl"
                        }`}
                    >
                      {item.count}
                    </Typography>
                    <Typography variant="caption" className="font-bold text-gray-800 mt-1 sm:mt-1.5 block text-[11px] sm:text-xs">
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

          {/* People / Contacts */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
            <Typography variant="subheading" className="text-gray-900 mb-3 block">
              People &amp; Support
            </Typography>
            <div className="space-y-2.5">
              {peopleList.map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <Typography variant="bodySmall" className="font-bold text-gray-900 block">
                      {p.name}
                    </Typography>
                    <Typography variant="caption" className="text-primary-800 font-semibold mt-0.5 block">
                      {p.role}
                    </Typography>
                    {p.description && (
                      <Typography variant="caption" className="text-gray-500 font-medium mt-0.5 block">
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

          {/* Helpful Links & Actions */}
          <div className="bg-gradient-to-br from-primary-700 via-primary-850 to-primary-600 text-white rounded-2xl p-4 sm:p-5 shadow-xs relative overflow-hidden border border-primary-700/50">
            <div className="relative z-10">
              <Typography variant="subheading" className="text-white font-bold mb-1 block">
                Separation Resources
              </Typography>
              <Typography variant="bodySmall" className="text-primary-100 font-medium mb-3.5 leading-relaxed block text-xs sm:text-sm">
                Review company exit policies, gratuity rules, and the asset handover checklist.
              </Typography>
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => setShowPolicyModal(true)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors font-semibold text-xs border border-white/10 backdrop-blur-xs"
                >
                  <Typography variant="bodySmall" className="font-semibold text-white">
                    View separation policy
                  </Typography>
                  <ChevronRight className="w-3.5 h-3.5 text-primary-200" />
                </button>
                <button
                  onClick={handleDownloadChecklist}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors font-semibold text-xs border border-white/10 backdrop-blur-xs"
                >
                  <Typography variant="bodySmall" className="font-semibold text-white">
                    Download exit checklist (PDF)
                  </Typography>
                  <Download className="w-3.5 h-3.5 text-primary-200" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Separation Policy Modal */}
      {showPolicyModal &&
        createPortal(
          <div
            className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[9999] w-screen h-screen flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 m-0"
            onClick={() => setShowPolicyModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto p-6 relative flex flex-col gap-4 border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-primary-50 text-primary-800 border border-primary-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary-700" />
                  </div>
                  <Typography variant="h4" className="text-gray-900">
                    Separation Policy Highlights
                  </Typography>
                </div>
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-gray-700 space-y-3.5 leading-relaxed">
                <div>
                  <Typography variant="label" className="font-bold text-gray-900 uppercase tracking-wider mb-1 block">
                    1. Notice Period &amp; Buyout
                  </Typography>
                  <Typography variant="bodySmall" className="text-gray-600 font-medium block">
                    The standard notice period for managerial roles is 90 days. Early release is
                    subject to project handover sign-off and reporting manager approval.
                  </Typography>
                </div>

                <div>
                  <Typography variant="label" className="font-bold text-gray-900 uppercase tracking-wider mb-1 block">
                    2. Full &amp; Final Settlement (FnF)
                  </Typography>
                  <Typography variant="bodySmall" className="text-gray-600 font-medium block">
                    FnF will be computed including leave encashment (earned leaves up to maximum 30
                    days), pro-rated salary, and applicable bonuses or clawbacks. Settlement will be
                    disbursed within 45 days of the last working day.
                  </Typography>
                </div>

                <div>
                  <Typography variant="label" className="font-bold text-gray-900 uppercase tracking-wider mb-1 block">
                    3. Asset Handover
                  </Typography>
                  <Typography variant="bodySmall" className="text-gray-600 font-medium block">
                    All company-issued equipment (laptops, monitors, access tags) must be surrendered
                    to IT and Facilities at least 2 business days prior to the last working day.
                  </Typography>
                </div>

                <div>
                  <Typography variant="label" className="font-bold text-gray-900 uppercase tracking-wider mb-1 block">
                    4. PF &amp; Gratuity Transfer
                  </Typography>
                  <Typography variant="bodySmall" className="text-gray-600 font-medium block">
                    PF transfer can be initiated through the EPFO portal 30 days after the last
                    working day. Gratuity is applicable for continuous service exceeding 5 years.
                  </Typography>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <Button variant="contain" size="sm" onClick={() => setShowPolicyModal(false)}>
                  Understood
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SeparationDashboard;


