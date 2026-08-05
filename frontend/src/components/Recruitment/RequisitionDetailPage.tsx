/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Info, Eye, FileText, ChevronLeft } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import Badge from "../shared/Badge";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import { formatToIndianDateWithTime } from "../../utils/formatToIndianDate";
import { useScreenSize } from "../../hooks/useScreenSize";

type TabKey = "position_details" | "custom_approval";

const RequisitionDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDesktop } = useScreenSize();
  const [activeTab, setActiveTab] = useState<TabKey>("position_details");

  // Get requisition data from navigation state
  const requisition = location.state?.requisition;

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // --- Computed values ---
  const positionDetails = useMemo(() => {
    return requisition?.custom_position_details || [];
  }, [requisition?.custom_position_details]);

  const approvalFlow = useMemo(() => {
    return requisition?.custom_approval_flow || [];
  }, [requisition?.custom_approval_flow]);

  const vacancyBreakdown = useMemo(() => {
    return requisition?.custom_vacancy_breakdown || null;
  }, [requisition?.custom_vacancy_breakdown]);

  const newCount = useMemo(() => {
    if (vacancyBreakdown?.new !== undefined) return vacancyBreakdown.new;
    return positionDetails.filter((p: any) => p.vacancy_type === "New").length;
  }, [vacancyBreakdown, positionDetails]);

  const replacementCount = useMemo(() => {
    if (vacancyBreakdown?.replacement !== undefined)
      return vacancyBreakdown.replacement;
    return positionDetails.filter((p: any) => p.vacancy_type === "Replacement")
      .length;
  }, [vacancyBreakdown, positionDetails]);

  const totalPositions = useMemo(() => {
    if (vacancyBreakdown?.total !== undefined) return vacancyBreakdown.total;
    return requisition?.no_of_positions || positionDetails.length || 0;
  }, [vacancyBreakdown, requisition?.no_of_positions, positionDetails]);

  const maxPositionsAllowed = useMemo(() => {
    return (
      requisition?.custom_max_positions_allowed ||
      requisition?.no_of_positions ||
      totalPositions
    );
  }, [
    requisition?.custom_max_positions_allowed,
    requisition?.no_of_positions,
    totalPositions,
  ]);

  const getStatusIcon = useCallback((status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "completed" || s === "approved") {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500">
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </span>
      );
    }
    if (s === "pending" || s === "in progress") {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-400">
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M12 8v4l3 3"
            />
          </svg>
        </span>
      );
    }
    if (s === "rejected") {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500">
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-300">
        <svg
          className="w-3.5 h-3.5 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M12 8v4m0 4h.01"
          />
        </svg>
      </span>
    );
  }, []);

  // No data fallback
  if (!requisition) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Typography variant="h4" className="text-gray-700 font-semibold">
          No requisition data found
        </Typography>
        <Typography variant="bodySmall" className="text-gray-500">
          Please go back and select a requisition from the list.
        </Typography>
        <button
          onClick={handleBack}
          className="mt-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; showInfo?: boolean }[] = [
    { key: "position_details", label: "Position Details" },
    { key: "custom_approval", label: "Custom Approval Flow", showInfo: true },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* Back navigation */}
      <div className="flex items-center gap-2 px-2 pt-1 pb-3">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-gray-700 transition-colors" />
          <span className="font-medium">Back to Requisitions</span>
        </button>
      </div>

      {/* Requisition Header */}
      <div className="px-2 mb-5">
        <div className="flex items-center gap-3 mb-1">
          <Typography variant="h4" className="font-bold text-gray-900">
            {requisition.name}
          </Typography>
          {requisition.status && (
            <Badge
              label={requisition.status}
              backgroundColor={getStatusColor(requisition.status)}
            />
          )}
        </div>
        <Typography variant="bodySmall" className="text-gray-500">
          {requisition.designation_title || requisition.designation} —{" "}
          {requisition.department_title || requisition.department}
        </Typography>
      </div>

      {/* Position Selection Summary Card */}
      <div className="mx-2 mb-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5">
        <Typography
          variant="subheading"
          className="font-bold text-gray-900 mb-4"
        >
          Position Selection
        </Typography>
        <div
          className={`grid gap-4 ${isDesktop ? "grid-cols-4" : "grid-cols-2"}`}
        >
          <div>
            <Typography
              variant="bodySmall"
              className="text-gray-500 text-xs mb-0.5"
            >
              Number of New Position(s)
            </Typography>
            <Typography
              variant="bodySmall"
              className="font-semibold text-gray-500"
            >
              : {newCount}
            </Typography>
          </div>
          <div>
            <Typography
              variant="bodySmall"
              className="text-gray-500 text-xs mb-0.5"
            >
              Number of Replacement Position(s)
            </Typography>
            <Typography
              variant="bodySmall"
              className="font-semibold text-gray-500"
            >
              : {replacementCount}
            </Typography>
          </div>
          <div>
            <Typography
              variant="bodySmall"
              className="text-gray-500 text-xs mb-0.5"
            >
              Number of Position(s)
            </Typography>
            <Typography
              variant="bodySmall"
              className="font-semibold text-gray-500"
            >
              : {totalPositions}
            </Typography>
          </div>
          <div className="flex items-start gap-2">
            <div>
              <Typography
                variant="bodySmall"
                className="text-gray-500 text-xs mb-0.5"
              >
                Max Position(s) Allowed
              </Typography>
              <Typography
                variant="bodySmall"
                className="font-semibold text-gray-500 flex items-center gap-1"
              >
                : {maxPositionsAllowed}
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-2 mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-5 py-3 text-sm font-medium transition-colors flex items-center gap-1.5
                  ${
                    activeTab === tab.key
                      ? "text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-gray-900 after:rounded-t-full"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {tab.label}
                {tab.showInfo && <Info className="w-4 h-4 text-gray-400" />}
              </button>
            ))}

            {/* Legend (only on position details tab) */}
            {activeTab === "position_details" && (
              <div className="ml-auto flex items-center gap-4 pr-2">
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  New
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
                  Replacement
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === "position_details" && (
            <PositionDetailsTab
              positionDetails={positionDetails}
              isDesktop={isDesktop}
            />
          )}
          {activeTab === "custom_approval" && (
            <CustomApprovalTab
              approvalFlow={approvalFlow}
              isDesktop={isDesktop}
              getStatusIcon={getStatusIcon}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Position Details Tab ────────────────────────────────────────────────

interface PositionDetailsTabProps {
  positionDetails: any[];
  isDesktop: boolean;
}

const PositionDetailsTab = ({
  positionDetails,
  isDesktop,
}: PositionDetailsTabProps) => {
  if (!positionDetails || positionDetails.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Typography variant="bodySmall">No positions specified.</Typography>
      </div>
    );
  }

  if (!isDesktop) {
    // Mobile card view
    return (
      <div className="space-y-3">
        {positionDetails.map((pos: any, idx: number) => {
          const isReplacement = pos.vacancy_type === "Replacement";
          return (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-1 h-8 rounded-full ${
                    isReplacement ? "bg-orange-400" : "bg-green-500"
                  }`}
                />
                <Typography
                  variant="bodySmall"
                  className="font-bold text-gray-900"
                >
                  Position {idx + 1}
                </Typography>
                <Badge
                  label={pos.vacancy_type || "New"}
                  size="sm"
                  backgroundColor={
                    isReplacement
                      ? "bg-orange-100 text-orange-700"
                      : "bg-green-100 text-green-700"
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Functional Area</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {pos.functional_area_title || pos.functional_area || "—"}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Location</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {pos.location_title || pos.location || "—"}
                  </p>
                </div>
                {isReplacement && (
                  <div>
                    <span className="text-gray-500">Replacement for</span>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {pos.replacement_for_title || pos.replacement_for || "—"}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Reporting Manager</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {pos.reporting_manager ? (
                      <WrapperHoverCard
                        employeeId={String(pos.reporting_manager)}
                      >
                        <span className="cursor-help underline decoration-dotted decoration-gray-300 underline-offset-2">
                          {pos.reporting_manager_title || pos.reporting_manager}
                        </span>
                      </WrapperHoverCard>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Employee Type</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {pos.employee_type || "—"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Position Number
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Functional Area
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Location <span className="text-red-500">*</span>
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Replacement for <span className="text-red-500">*</span>
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Reporting manager <span className="text-red-500">*</span>
            </th>
            <th className="px-5 py-3.5 text-left text-sm font-bold text-gray-800">
              Employee Type <span className="text-red-500">*</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {positionDetails.map((pos: any, idx: number) => {
            const isReplacement = pos.vacancy_type === "Replacement";
            return (
              <tr
                key={idx}
                className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors align-top"
              >
                {/* Position Number with colored left bar */}
                <td className="px-5 py-4 text-sm text-gray-900">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-[3px] h-6 rounded-lg flex-shrink-0 ${
                        isReplacement ? "bg-orange-400" : "bg-green-500"
                      }`}
                    />
                    <span>{pos.position_number || idx + 1}</span>
                  </div>
                </td>

                {/* Functional Area */}
                <td className="px-5 py-4 text-sm text-gray-700">
                  {pos.functional_area_title || pos.functional_area || "—"}
                </td>

                {/* Location */}
                <td className="px-5 py-4 text-sm text-gray-700 max-w-[260px]">
                  <span className="whitespace-pre-line leading-relaxed">
                    {pos.location_title || pos.location || "—"}
                  </span>
                </td>

                {/* Replacement for */}
                <td className="px-5 py-4 text-sm text-gray-700">
                  {pos.replacement_for ? (
                    <div>
                      <span>
                        {pos.replacement_for_title
                          ? `${pos.replacement_for_title} (${pos.replacement_for})`
                          : pos.replacement_for}
                      </span>
                      <button className="block text-xs text-blue-600 hover:underline mt-1">
                        View employee
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>

                {/* Reporting manager */}
                <td className="px-5 py-4 text-sm text-gray-700">
                  {pos.reporting_manager ? (
                    <WrapperHoverCard
                      employeeId={String(pos.reporting_manager)}
                    >
                      <span className="cursor-help underline decoration-dotted decoration-gray-300 underline-offset-2">
                        {pos.reporting_manager_title
                          ? `${pos.reporting_manager_title} (${pos.reporting_manager})`
                          : pos.reporting_manager}
                      </span>
                    </WrapperHoverCard>
                  ) : (
                    "—"
                  )}
                </td>

                {/* Employee Type */}
                <td className="px-5 py-4 text-sm text-gray-700">
                  {pos.employee_type || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Custom Approval Tab ─────────────────────────────────────────────────

interface CustomApprovalTabProps {
  approvalFlow: any[];
  isDesktop: boolean;
  getStatusIcon: (status: string) => React.ReactNode;
}

const CustomApprovalTab = ({
  approvalFlow,
  isDesktop,
  getStatusIcon,
}: CustomApprovalTabProps) => {
  if (!approvalFlow || approvalFlow.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Typography variant="bodySmall">
          No approval flow configured.
        </Typography>
      </div>
    );
  }

  if (!isDesktop) {
    // Mobile card view
    return (
      <div className="space-y-3">
        {approvalFlow.map((entry: any, idx: number) => (
          <div
            key={idx}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge
                  label={
                    entry.approver_role ||
                    entry.role ||
                    `Level ${entry.level || idx + 1}`
                  }
                  size="sm"
                  backgroundColor="bg-gray-100 text-gray-700"
                />
                {entry.level && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {entry.level}
                  </span>
                )}
              </div>
              {getStatusIcon(entry.status || "")}
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Action Taken by</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {entry.action_taken_by_name || entry.action_taken_by || "—"}
                  {entry.on_behalf_of && (
                    <span className="block text-gray-500 text-[11px]">
                      (On Behalf of{" "}
                      {entry.on_behalf_of_name || entry.on_behalf_of})
                    </span>
                  )}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Action</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {entry.action || "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Trigger Date</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {entry.trigger_date
                    ? formatToIndianDateWithTime(entry.trigger_date)
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Completed Date</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {entry.completed_date
                    ? formatToIndianDateWithTime(entry.completed_date)
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Approver(s)
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Action Taken by
            </th>
            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Action
            </th>
            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Status
            </th>
            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Approver Form
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Trigger Date
            </th>
            <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Completed Date
            </th>
            <th className="px-5 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Documents
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {approvalFlow.map((entry: any, idx: number) => (
            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
              {/* Approver(s) */}
              <td className="px-5 py-4 text-sm">
                <Badge
                  label={
                    entry.approver_role ||
                    entry.role ||
                    `Level ${entry.level || idx + 1}`
                  }
                  size="sm"
                  backgroundColor="bg-gray-100 text-gray-700"
                  icon={
                    entry.level ? (
                      <span className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-md font-bold">
                        {entry.level}
                      </span>
                    ) : undefined
                  }
                />
              </td>

              {/* Action Taken by */}
              <td className="px-5 py-4 text-sm text-gray-700">
                <div>
                  {entry.action_taken_by_name || entry.action_taken_by || "—"}
                  {entry.on_behalf_of && (
                    <span className="block text-gray-500 text-xs mt-0.5">
                      (On Behalf of{" "}
                      {entry.on_behalf_of_name || entry.on_behalf_of})
                    </span>
                  )}
                </div>
              </td>

              {/* Action */}
              <td className="px-5 py-4 text-sm text-gray-700 text-center">
                {entry.action || "—"}
              </td>

              {/* Status */}
              <td className="px-5 py-4 text-center">
                {getStatusIcon(entry.status || "")}
              </td>

              {/* Approver Form */}
              <td className="px-5 py-4 text-center">
                {entry.approver_form ? (
                  <button
                    className="text-gray-500 hover:text-primary transition-colors"
                    onClick={() => {
                      if (entry.approver_form) {
                        window.open(entry.approver_form, "_blank");
                      }
                    }}
                  >
                    <Eye className="w-5 h-5 mx-auto" />
                  </button>
                ) : (
                  <Eye className="w-5 h-5 mx-auto text-gray-300" />
                )}
              </td>

              {/* Trigger Date */}
              <td className="px-5 py-4 text-sm text-gray-700">
                {entry.trigger_date
                  ? formatToIndianDateWithTime(entry.trigger_date)
                  : "—"}
              </td>

              {/* Completed Date */}
              <td className="px-5 py-4 text-sm text-gray-700">
                {entry.completed_date
                  ? formatToIndianDateWithTime(entry.completed_date)
                  : "—"}
              </td>

              {/* Documents */}
              <td className="px-5 py-4 text-center">
                {entry.documents ? (
                  <button
                    className="text-gray-500 hover:text-primary transition-colors"
                    onClick={() => {
                      if (typeof entry.documents === "string") {
                        window.open(entry.documents, "_blank");
                      }
                    }}
                  >
                    <FileText className="w-5 h-5 mx-auto" />
                  </button>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
    case "approved active":
    case "open":
    case "open & approved":
      return "bg-green-100 text-green-700";
    case "pending":
    case "approval pending":
      return "bg-yellow-100 text-yellow-700";
    case "draft":
    case "approved draft":
      return "bg-orange-100 text-orange-700";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "filled":
    case "closed":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-50 text-gray-600";
  }
};

export default RequisitionDetailPage;
