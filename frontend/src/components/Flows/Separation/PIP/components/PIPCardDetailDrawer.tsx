import React from "react";
import {
  AlertCircle,
  ExternalLink,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

import { useGetFlowRequestById } from "../../../../../hooks/useFlows";
import { Typography } from "../../../../shared/atoms/Typography";
import Button from "../../../../shared/atoms/Button";
import NoDataFound from "../../../../shared/atoms/NoDataFound";
import CircularLoader from "../../../../shared/atoms/CircularLoader";
import SideDrawer from "../../../../shared/SideDrawer";
import WrapperHoverCard from "../../../../shared/WrapperHoverCard";
import formatToIndianDate from "../../../../../utils/formatToIndianDate";
import { errorResponseFormater } from "../../../../../utils/errorResponseFormater";

interface PIPCardDetailDrawerProps {
  requestId: string | null;
  targetEmployeeId: string;
  onClose: () => void;
}

/**
 * Status badge helper for overall flow status
 */
const renderOverallStatusBadge = (status?: string) => {
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("completed") || normalized.includes("approved")) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        {status || "Completed"}
      </span>
    );
  }
  if (normalized.includes("rejected") || normalized.includes("failed")) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/80">
        <XCircle className="w-3.5 h-3.5 text-rose-600" />
        {status || "Rejected"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
      <Clock className="w-3.5 h-3.5 text-amber-600" />
      {status || "Pending"}
    </span>
  );
};

export const PIPCardDetailDrawer: React.FC<PIPCardDetailDrawerProps> = ({
  requestId,
  targetEmployeeId,
  onClose,
}) => {
  const { data: flowResponse, isLoading, isError, error } = useGetFlowRequestById(
    requestId || ""
  );

  const flowData = flowResponse?.data;
  const approvalStages = flowData?.approval_stages || [];
  const workflowStages = flowData?.workflow_stages || [];

  const handleOpenFullPage = () => {
    if (!requestId) return;
    const query = targetEmployeeId ? `?target_user=${encodeURIComponent(targetEmployeeId)}` : "";
    const url = `/webapp/flow-app/flow-request/${encodeURIComponent(requestId)}${query}`;
    window.open(url, "_blank");
  };

  return (
    <SideDrawer
      open={Boolean(requestId)}
      onClose={onClose}
      size="xl"
      title={`PIP Workflow Details — #${requestId || ""}`}
    >
      <div className="p-5 space-y-6">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500">
            <CircularLoader size="md" color="blue-500" />
            <Typography variant="bodySmall">Loading workflow details...</Typography>
          </div>
        ) : isError ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2">
            <AlertCircle className="w-7 h-7 text-rose-500 mx-auto" />
            <Typography variant="bodyMedium" className="text-rose-800 font-semibold">
              Failed to load details
            </Typography>
            <Typography variant="bodySmall" className="text-rose-600">
              {errorResponseFormater(error, "Could not fetch workflow details.")}
            </Typography>
          </div>
        ) : !flowData ? (
          <NoDataFound
            title="Workflow Request Not Found"
            subtitle="Details for this PIP workflow could not be retrieved."
          />
        ) : (
          <>
            {/* Header Summary Card */}
            <div className="bg-gray-50/80 rounded-2xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <Typography variant="label" className="text-gray-500 text-xs">
                    Flow Name
                  </Typography>
                  <Typography variant="subheading" className="text-gray-900 font-bold mt-0.5">
                    {flowData.flow_name || flowData.category || "PIP Flow"}
                  </Typography>
                </div>
                {renderOverallStatusBadge(
                  flowData.overall_flow_status || flowData.approval_status
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-200 text-xs">
                <div>
                  <Typography variant="caption" className="text-gray-500 text-xs">
                    Initiated On:{" "}
                  </Typography>
                  <Typography variant="caption" className="font-semibold text-gray-800 text-xs">
                    {flowData.initiated_on ? formatToIndianDate(flowData.initiated_on) : "—"}
                  </Typography>
                </div>
                <div>
                  <Typography variant="caption" className="text-gray-500 text-xs">
                    Initiated By:{" "}
                  </Typography>
                  {flowData.initiated_by_emp_id || (flowData as unknown as Record<string, string>).initiated_by_employee_id ? (
                    <WrapperHoverCard
                      employeeId={
                        flowData.initiated_by_emp_id ||
                        (flowData as unknown as Record<string, string>).initiated_by_employee_id
                      }
                    >
                      <Typography
                        variant="caption"
                        className="font-semibold text-gray-800 cursor-pointer hover:underline hover:text-primary text-xs"
                      >
                        {flowData.initiated_by ||
                          flowData.initiated_by_emp_id ||
                          (flowData as unknown as Record<string, string>).initiated_by_employee_id}
                      </Typography>
                    </WrapperHoverCard>
                  ) : (
                    <Typography variant="caption" className="font-semibold text-gray-800 text-xs">
                      {flowData.initiated_by || "—"}
                    </Typography>
                  )}
                </div>
                <div>
                  <Typography variant="caption" className="text-gray-500 text-xs">
                    Workflow Request:{" "}
                  </Typography>
                  <Typography variant="caption" className="font-mono font-semibold text-primary-700 text-xs">
                    #{requestId}
                  </Typography>
                </div>
                <div>
                  <Typography variant="caption" className="text-gray-500 text-xs">
                    Initiated For:{" "}
                  </Typography>
                  {flowData.initiated_for_emp_id ||
                    (flowData as unknown as Record<string, string>).initiated_for_employee_id ||
                    targetEmployeeId ? (
                    <WrapperHoverCard
                      employeeId={
                        flowData.initiated_for_emp_id ||
                        (flowData as unknown as Record<string, string>).initiated_for_employee_id ||
                        targetEmployeeId
                      }
                    >
                      <Typography
                        variant="caption"
                        className="font-semibold text-gray-800 cursor-pointer hover:underline hover:text-primary text-xs"
                      >
                        {flowData.initiated_for ||
                          flowData.initiated_for_emp_id ||
                          (flowData as unknown as Record<string, string>).initiated_for_employee_id ||
                          targetEmployeeId}
                      </Typography>
                    </WrapperHoverCard>
                  ) : (
                    <Typography variant="caption" className="font-semibold text-gray-800 text-xs">
                      {flowData.initiated_for || targetEmployeeId || "—"}
                    </Typography>
                  )}
                </div>
              </div>
            </div>

            {/* Approval / Workflow Stages */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary-600" />
                <Typography variant="subheading" className="text-gray-900 font-bold text-sm">
                  Workflow Stages ({approvalStages.length + workflowStages.length})
                </Typography>
              </div>

              {approvalStages.length === 0 && workflowStages.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <Typography variant="caption" className="text-gray-500">
                    No individual stage steps recorded yet.
                  </Typography>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {approvalStages.map((stage: Record<string, unknown>, idx: number) => {
                    const stageStatus = (stage.status as string) || "Pending";
                    const allocatedTo = Array.isArray(stage.allocated_to)
                      ? stage.allocated_to
                      : [];

                    return (
                      <div
                        key={`approval-stage-${idx}`}
                        className="bg-white rounded-xl border border-gray-200 p-3.5 space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-sm text-gray-900">
                              {(stage.stage_name as string) ||
                                (stage.name as string) ||
                                `Stage ${idx + 1}`}
                            </span>
                          </div>
                          {renderOverallStatusBadge(stageStatus)}
                        </div>

                        {allocatedTo.length > 0 && (
                          <div className="text-xs text-gray-600 pt-1 border-t border-gray-100 flex items-center gap-1.5 flex-wrap">
                            <span className="text-gray-400">Assigned to:</span>
                            {allocatedTo.map(
                              (
                                user: { name?: string; user_id?: string; employee?: string },
                                uIdx: number
                              ) => {
                                const empId = user.employee;
                                const content = (
                                  <span
                                    className={`bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-medium text-[11px] ${empId ? "cursor-pointer hover:bg-gray-200 hover:text-primary" : ""
                                      }`}
                                  >
                                    {user.name || user.user_id || user.employee}
                                  </span>
                                );
                                return empId ? (
                                  <WrapperHoverCard key={uIdx} employeeId={empId}>
                                    {content}
                                  </WrapperHoverCard>
                                ) : (
                                  <React.Fragment key={uIdx}>{content}</React.Fragment>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Action: Open Full Page */}
            <div className="pt-4 border-t border-gray-200">
              <Button
                variant="contain"
                size="md"
                onClick={handleOpenFullPage}
                className="w-full justify-center font-semibold shadow-xs"
                icon={<ExternalLink className="w-4 h-4" />}
              >
                Open Full Workflow Details Page
              </Button>
            </div>
          </>
        )}
      </div>
    </SideDrawer>
  );
};

export default PIPCardDetailDrawer;
