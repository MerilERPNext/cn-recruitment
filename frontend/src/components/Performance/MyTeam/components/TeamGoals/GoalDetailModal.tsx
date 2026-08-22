import React, { useState } from "react";
import { X } from "lucide-react";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge from "../../../../shared/Badge";
import Modal from "../../../../shared/Modal";
import Avatar from "../../../../shared/Avatar";
import { GoalDetailData } from "../../types";
import { useGetGoalApprovalDetail } from "../../../../../hooks/usePerformance";
import { getPerformanceErrorMessage } from "../../../../../services/performanceService";

interface GoalDetailModalProps {
  goal?: GoalDetailData;
  employee: string;
  goalKey: string;
  onClose: () => void;
  onApprove: () => void;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  onClose,
  onApprove,
  employee,
  goalKey,
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
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 items-center mt-1">
            <Badge
              label={`${apiData?.methodology || "OKR"} · Individual`}
              backgroundColor="bg-purple-50 text-purple-700"
              size="sm"
            />
            <Badge
              label={apiData?.status_label || apiData?.goal_status || "-"}
              backgroundColor="bg-yellow-50 text-yellow-700"
              size="sm"
            />
            <Badge
              label={apiData?.plan_status ? `Plan: ${apiData.plan_status}` : "-"}
              backgroundColor="bg-orange-50 text-orange-600"
              size="sm"
            />
            {flags.map((flag) => (
              <Badge
                key={flag.key || flag.label}
                label={flag.label}
                backgroundColor="bg-red-50 text-red-700"
                size="sm"
              />
            ))}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-2 p-1 border border-gray-200 rounded-lg"
            aria-label="Close goal detail"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 font-medium animate-pulse">
              Loading goal details...
            </div>
          ) : error || !apiData ? (
            <div className="py-12 text-center text-slate-500 font-medium space-y-1">
              <div className="text-sm font-semibold text-slate-700">
                {error
                  ? getPerformanceErrorMessage(error, "Goal detail not found.")
                  : "No goal details found."}
              </div>
              <Typography variant="caption" className="text-slate-400 block">
                The requested goal data is not available in the plan.
              </Typography>
            </div>
          ) : (
            <>
              {/* Title + Employee */}
              <div>
                <Typography variant="h3" className="text-gray-900 mb-2 font-bold">
                  {apiData?.title || "-"}
                </Typography>
                <div className="flex items-center gap-2">
                  <Avatar
                    name={apiData?.employee_name || employee || "Employee"}
                    fontSize="text-xs"
                    size="h-8 w-8"
                    avatarBgColor="bg-blue-50"
                    avatarTextColor="text-blue-600"
                  />
                  <Typography variant="bodySmall" className="text-gray-500">
                    {apiData?.employee_name || "-"} · {apiData?.designation || "-"} · submitted{" "}
                    {apiData?.submitted_ago || "-"}
                  </Typography>
                </div>
              </div>

              {/* Meta Grid */}
              <div className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-6`}>
                {metaItems.map((item) => (
                  <div key={item.label}>
                    <Typography
                      variant="caption"
                      className="text-gray-400 uppercase tracking-wider block mb-1 font-semibold"
                    >
                      {item.label}
                    </Typography>
                    <Typography variant="bodySmall" className="font-semibold text-gray-800">
                      {item.value}
                    </Typography>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div>
                <Typography variant="bodySmall" className="font-medium text-gray-900 mb-2 block">
                  Description
                </Typography>
                <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-4">
                  <Typography variant="bodySmall" className="text-gray-600">
                    {apiData?.description || "-"}
                  </Typography>
                </div>
              </div>

              {/* Key Results */}
              <div>
                <Typography variant="bodySmall" className="font-medium text-gray-900 mb-3 block">
                  Key Results ({keyResults.length})
                </Typography>
                {keyResults.length > 0 ? (
                  <div className="space-y-2">
                    {keyResults.map((kr, idx) => (
                      <div
                        key={kr.goal_key || idx}
                        className="flex items-center justify-between gap-3 py-3 px-4 border border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Badge label={`KR ${idx + 1}`} variant="purple-outline" size="sm" />
                          <Typography variant="bodySmall" className="text-gray-800 font-medium">
                            {kr.title || "-"}
                          </Typography>
                        </div>
                        <Typography variant="caption" className="text-gray-500 shrink-0">
                          Target {kr.target ?? "-"}
                        </Typography>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic py-2">No key results available.</div>
                )}
              </div>

              {/* Add Comment */}
              <div>
                <Typography variant="bodySmall" className="font-medium text-gray-900 mb-2 block">
                  Add comment{" "}
                  <span className="text-gray-400 font-normal">
                    (visible to {(apiData?.employee_name || employee || "").split(" ")[0] || "-"})
                  </span>
                </Typography>
                <textarea
                  aria-label={`Add comment for ${apiData?.employee_name || employee || "-"}`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Type your comment here..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-sm"
                />
              </div>

              {/* Audit */}
              <div className="bg-slate-50 rounded-xl p-4 mb-2">
                <Typography
                  variant="caption"
                  className="uppercase tracking-wider text-gray-500 font-bold block mb-1.5"
                >
                  AUDIT
                </Typography>
                {auditLogs.length > 0 ? (
                  <div className="space-y-1.5">
                    {auditLogs.map((log, index) => (
                      <Typography key={index} variant="bodySmall" className="text-gray-600 block">
                        <span className="font-semibold text-gray-800">{log.action || "-"}</span> by{" "}
                        <span className="font-medium text-gray-700">{log.by_name || log.actioned_by || "-"}</span>
                        {log.actioned_on ? ` (${log.actioned_on})` : ""}
                        {log.note ? ` — ${log.note}` : ""}
                      </Typography>
                    ))}
                  </div>
                ) : (
                  <Typography variant="bodySmall" className="text-gray-500">
                    -
                  </Typography>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-1px_2px_rgba(15,23,42,0.04)]">
          <Typography variant="caption" className="text-gray-500">
            {apiData?.auto_approve_on ? `Auto-approves on ${apiData.auto_approve_on}` : "-"}
          </Typography>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              bgColor="text"
              size="sm"
              disabled={isActionDisabled}
              onClick={onClose}
              className="h-9 w-[92px] bg-white px-0 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send back
            </Button>
            <Button
              variant="outline"
              bgColor="error"
              size="sm"
              disabled={isActionDisabled}
              className="h-9 w-[70px] bg-white px-0 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reject
            </Button>
            <Button
              variant="contain"
              bgColor="success"
              size="sm"
              disabled={isActionDisabled}
              onClick={onApprove}
              className="h-9 w-[110px] px-0 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve goal
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default GoalDetailModal;
