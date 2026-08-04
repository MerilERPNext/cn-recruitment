import { useState } from "react";
import { Check, ChevronDown, Clock, Info, MessageSquareText, X } from "lucide-react";
import { useGetApprovalFlow } from "../../../hooks/useAttendance";
import { Typography } from "../../shared/atoms/Typography";
import Tooltip from "../../shared/Tooltip";
import Badge from "../../shared/Badge";
import { getBadgePropsByStatus } from "../../../utils/helperUtils";
import { formatToIndianDateWithTime } from "../../../utils/formatToIndianDate";

interface ApprovalFlowProps {
  doctype: string;
  docname: string;
}

const dotClasses = (status: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
      return "bg-green-500";
    case "rejected":
      return "bg-red-500";
    case "pending":
      return "bg-yellow-400";
    default:
      return "bg-gray-300";
  }
};

const statusIcon = (status: string) => {
  switch (status?.toLowerCase()) {
    case "approved":
      return <Check className="w-3 h-3 text-white" strokeWidth={3} />;
    case "rejected":
      return <X className="w-3 h-3 text-white" strokeWidth={3} />;
    case "pending":
      return <Clock className="w-3 h-3 text-white" strokeWidth={3} />;
    default:
      return null;
  }
};

const initials = (name?: string) => {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
};

const ApprovalFlow = ({ doctype, docname }: ApprovalFlowProps) => {
  const { data, isLoading } = useGetApprovalFlow(doctype, docname);
  const [openComments, setOpenComments] = useState<Record<number, boolean>>({});

  const toggleComment = (idx: number) =>
    setOpenComments((prev) => ({ ...prev, [idx]: !prev[idx] }));

  if (isLoading) {
    return (
      <div className="pt-4 border-t border-gray-100">
        <div className="animate-pulse h-4 w-32 bg-gray-200 rounded" />
      </div>
    );
  }

  if (!data || !data.has_approval_flow || !data.stages?.length) return null;

  return (
    <div className="pt-4 border-t border-gray-100">
      <Typography variant="subheading" className="font-semibold mb-1">
        Approval Flow
      </Typography>

      {data.status_text && (
        <Typography
          variant="bodySmall"
          color="body2"
          className="text-xs text-gray-500 mb-3"
        >
          {data.status_text}
        </Typography>
      )}

      <div className="flex flex-col">
        {data.stages.map((stage, idx) => {
          const isLast = idx === data.stages.length - 1;
          const isCommentOpen = !!openComments[idx];

          return (
            <div
              key={`${stage.stage_name}-${idx}`}
              className="relative flex gap-3"
            >
              {/* Timeline rail + dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${dotClasses(
                    stage.status,
                  )}`}
                >
                  {statusIcon(stage.status)}
                </div>
                {!isLast && (
                  <span className="w-px flex-1 min-h-[28px] bg-gray-200 my-0.5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Typography
                      variant="bodySmall"
                      className="font-medium text-gray-800"
                    >
                      Level {idx + 1}
                    </Typography>
                    <Tooltip
                      type="custom"
                      position="top"
                      content={
                        <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-3 w-56 flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {initials(stage.user)}
                          </div>
                          <div className="min-w-0">
                            <Typography
                              variant="bodySmall"
                              className="font-semibold text-gray-900 truncate"
                            >
                              {stage.user || "—"}
                            </Typography>
                            <Typography
                              variant="bodySmall"
                              className="text-xs text-gray-500 truncate"
                            >
                              {[stage.employee_id, stage.designation]
                                .filter(Boolean)
                                .join(" | ")}
                            </Typography>
                          </div>
                        </div>
                      }
                    >
                      <Info className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />
                    </Tooltip>
                  </div>

                  <Badge
                    label={stage.status}
                    backgroundColor={getBadgePropsByStatus(stage.status).backgroundColor}
                    textColor={getBadgePropsByStatus(stage.status).textColor}
                    size="sm"
                  />
                </div>

                {(stage.approval_time || stage.user) && (
                  <Typography
                    variant="bodySmall"
                    className="text-xs text-gray-500 mt-0.5"
                  >
                    {stage.user}
                    {stage.approval_time ? ` · ${formatToIndianDateWithTime(stage.approval_time)}` : ""}
                  </Typography>
                )}

                {stage.comment && (
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => toggleComment(idx)}
                      className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      <MessageSquareText className="w-3.5 h-3.5" />
                      Comment
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${isCommentOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {isCommentOpen && (
                      <div className="mt-1.5 text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-md p-2 leading-relaxed">
                        {stage.comment}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalFlow;
