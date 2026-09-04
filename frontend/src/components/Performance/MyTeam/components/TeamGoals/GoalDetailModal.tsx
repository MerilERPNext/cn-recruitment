import React, { useState } from "react";
import { X } from "lucide-react";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge from "../../../../shared/Badge";
import Modal from "../../../../shared/Modal";
import Avatar from "../../../../shared/Avatar";
import { GoalDetailData } from "../../types";
import { useGetGoalApprovalDetail } from "../../../../../hooks/usePerformance";
import { getPerformanceErrorMessage } from "../../../../../services/performanceService";
import GoalDetailSkeleton from "./GoalDetailSkeleton";
import GoalActionButtons from "./GoalActionButtons";

interface GoalDetailModalProps {
  goal?: GoalDetailData;
  employee: string;
  goalKey: string;
  onClose: () => void;
  onApprove?: () => void;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  onClose,
  employee,
  goalKey,
  onApprove,
}) => {
  const [comment, setComment] = useState("");
  const { isMobile } = useScreenSize();
  const { data: goalApprovalData, isLoading, error } = useGetGoalApprovalDetail({
    employee,
    goal_key: goalKey,
  });

  const apiData = goalApprovalData?.data;

  const keyResults = apiData?.key_results || [];
  const auditLogs = apiData?.audit || [];
  const flags = apiData?.flags || [];
  const isActionDisabled = isLoading || Boolean(error) || !apiData;

  const metaItems = [
    {
      label: "WEIGHTAGE",
      value:
        apiData?.weightage !== undefined && apiData?.weightage !== null
          ? `${apiData.weightage}%`
          : "-",
    },
    { label: "START", value: apiData?.start_date || "-" },
    { label: "END", value: apiData?.end_date || "-" },
    { label: "METRIC", value: apiData?.metric || "-" },
    { label: "ALIGNED TO", value: apiData?.department ? `${apiData.department}` : "-" },
    {
      label: "CONTRIBUTION",
      value:
        apiData?.plan_total_weightage !== undefined && apiData?.plan_total_weightage !== null
          ? `${apiData.plan_total_weightage}% of plan`
          : "-",
    },
    { label: "VISIBILITY", value: apiData?.approval_mode || "-" },
    { label: "AUTO-PULL", value: apiData?.goal_plan || "-" },
  ];

  return (
    <Modal isOpen onClose={onClose} size="md">
      <div className="flex flex-col max-h-[90vh] bg-card text-text-title">
        <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
          <div className="flex flex-wrap gap-2 items-center mt-1">
            <Badge
              label={`${apiData?.methodology || "OKR"} · Individual`}
              variant="purple"
              size="sm"
            />
            <Badge
              label={apiData?.status_label || apiData?.goal_status || "-"}
              variant="warning"
              size="sm"
            />
            <Badge
              label={apiData?.plan_status ? `Plan: ${apiData.plan_status}` : "-"}
              variant="info"
              size="sm"
            />
            {flags.map((flag) => (
              <Badge
                key={flag.key || flag.label}
                label={flag.label}
                variant="danger"
                size="sm"
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-text-body2 hover:text-text-title transition-colors ml-2 p-1 border border-border rounded-lg"
            aria-label="Close goal detail"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {isLoading ? (
            <GoalDetailSkeleton />
          ) : error || !apiData ? (
            <div className="py-12 text-center font-medium space-y-1">
              <Typography variant="bodySmall" className="font-semibold">
                {error
                  ? getPerformanceErrorMessage(error, "Goal detail not found.")
                  : "No goal details found."}
              </Typography>
              <Typography variant="caption" color="body2" className="block">
                The requested goal data is not available in the plan.
              </Typography>
            </div>
          ) : (
            <>
              <div>
                <Typography variant="h3" className="mb-2 font-bold break-words">
                  {apiData?.title || "-"}
                </Typography>
                <div className="flex items-center gap-2">
                  <Avatar
                    name={apiData?.employee_name || employee || "Employee"}
                    fontSize="text-xs"
                    size="h-8 w-8"
                    avatarBgColor="bg-blue-500/20"
                    avatarTextColor="text-primary"
                  />
                  <Typography variant="bodySmall" color="body2" className="break-words">
                    {apiData?.employee_name || "-"} · {apiData?.designation || "-"} · submitted{" "}
                    {apiData?.submitted_ago || "-"}
                  </Typography>
                </div>
              </div>

              <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-6`}>
                {metaItems.map((item) => (
                  <div key={item.label}>
                    <Typography
                      variant="caption"
                      color="body2"
                      className="uppercase tracking-wider block mb-1 font-semibold text-[10px]"
                    >
                      {item.label}
                    </Typography>
                    <Typography variant="bodySmall" className="font-semibold break-words">
                      {item.value}
                    </Typography>
                  </div>
                ))}
              </div>

              <div>
                <Typography variant="bodySmall" className="font-medium mb-2 block">
                  Description
                </Typography>
                <div className="bg-app border border-border rounded-xl p-4 break-words overflow-hidden">
                  <Typography variant="bodySmall" color="body2" className="whitespace-pre-wrap break-words [word-break:break-word]">
                    {apiData?.description || "-"}
                  </Typography>
                </div>
              </div>

              <div>
                <Typography variant="bodySmall" className="font-medium mb-3 block">
                  Key Results ({keyResults.length})
                </Typography>
                {keyResults.length > 0 ? (
                  <div className="space-y-2">
                    {keyResults.map((kr, idx) => (
                      <div
                        key={kr.goal_key || idx}
                        className="flex items-center justify-between gap-3 py-3 px-4 border border-border rounded-xl bg-card hover:bg-slate-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge label={`KR ${idx + 1}`} variant="purple-outline" size="sm" />
                          <Typography variant="bodySmall" className="font-medium">
                            {kr.title || "-"}
                          </Typography>
                        </div>
                        <Typography variant="caption" color="body2" className="shrink-0">
                          Target {kr.target ?? "-"}
                        </Typography>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Typography variant="caption" color="body2" className="italic py-2 block">
                    No key results available.
                  </Typography>
                )}
              </div>

              <div>
                <Typography variant="bodySmall" className="font-medium mb-2 block">
                  Add comment{" "}
                  <span className="font-normal text-text-body2">
                    (visible to {(apiData?.employee_name || employee || "").split(" ")[0] || "-"})
                  </span>
                </Typography>
                <textarea
                  aria-label={`Add comment for ${apiData?.employee_name || employee || "-"}`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Type your comment here..."
                  rows={3}
                  className="w-full border border-border bg-card rounded-xl p-3 text-sm text-text-title placeholder-text-body2 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none shadow-sm"
                />
              </div>

              <div className="bg-app border border-border rounded-xl p-4 mb-2">
                <Typography
                  variant="caption"
                  color="body2"
                  className="uppercase tracking-wider font-bold block mb-1.5 text-[10px]"
                >
                  AUDIT
                </Typography>
                {auditLogs.length > 0 ? (
                  <div className="space-y-1.5">
                    {auditLogs.map((log, index) => (
                      <Typography key={index} variant="bodySmall" color="body2" className="block">
                        <span className="font-semibold text-text-title">{log.action || "-"}</span> by{" "}
                        <span className="font-medium text-text-title">{log.by_name || log.actioned_by || "-"}</span>
                        {log.actioned_on ? ` (${log.actioned_on})` : ""}
                        {log.note ? ` — ${log.note}` : ""}
                      </Typography>
                    ))}
                  </div>
                ) : (
                  <Typography variant="bodySmall" color="body2">
                    No audit found!
                  </Typography>
                )}
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 border-t border-border bg-card px-6 py-4 shadow-[0_-1px_2px_rgba(15,23,42,0.04)]">
          <Typography variant="caption" color="body2">
            {apiData?.auto_approve_on ? `Auto-approves on ${apiData.auto_approve_on}` : "-"}
          </Typography>
          <GoalActionButtons
            items={{ employee, goal_key: goalKey }}
            actions={apiData?.actions}
            note={comment}
            disabled={isActionDisabled}
            onApprove={onApprove}
            onClose={onClose}
          />
        </div>
      </div>
    </Modal>
  );
};

export default GoalDetailModal;
