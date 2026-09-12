import React, { useMemo, useState } from "react";
import { ChevronDown, Eye, ShieldAlert } from "lucide-react";
import { FlowRevokeDetail } from "../../../../types/flows";
import formatToIndianDate, { formatToIndianDateWithTime } from "../../../../utils/formatToIndianDate";
import Button from "../../../shared/atoms/Button";
import StatusBadge from "../../../shared/atoms/statusBadge";
import FlowTable from "./FlowTable";

interface RevokeDetailsSectionProps {
  revoke: FlowRevokeDetail;
  haveRevokeForm?: boolean;
  onViewRevokeForm?: () => void;
}

const RevokeDetailsSection: React.FC<RevokeDetailsSectionProps> = ({
  revoke,
  haveRevokeForm = false,
  onViewRevokeForm,
}) => {
  const [stagesExpanded, setStagesExpanded] = useState(true);

  const hasStages = (revoke.approval_stages?.length ?? 0) > 0;

  const stageCounts = useMemo(() => {
    const stages = revoke.approval_stages || [];
    const completed = stages.filter(
      (s) => s.status === "Approved" || s.status === "Completed"
    ).length;
    const pending = stages.filter((s) => s.status === "Pending").length;
    const rejected = stages.filter((s) => s.status === "Rejected").length;
    return { completed, pending, rejected, total: stages.length };
  }, [revoke.approval_stages]);

  const formattedDate = useMemo(() => {
    if (!revoke.requested_on) return "—";
    try {
      return formatToIndianDateWithTime(revoke.requested_on);
    } catch {
      return formatToIndianDate(revoke.requested_on);
    }
  }, [revoke.requested_on]);

  return (
    <div className="rounded-xl border border-red-200 bg-white shadow-[0_2px_8px_rgba(239,68,68,0.06)] overflow-hidden transition-all duration-200">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-red-50 via-red-50/40 to-white px-5 py-4 border-b border-red-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm sm:text-base font-bold text-gray-900">
              Revocation Request
            </span>
            {revoke.request_id && (
              <span className="text-xs font-mono font-semibold text-red-700 bg-red-100/70 border border-red-200/80 px-2 py-0.5 rounded-md">
                {revoke.request_id}
              </span>
            )}
            <StatusBadge status={revoke.status} />
          </div>
        </div>

        {haveRevokeForm && onViewRevokeForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewRevokeForm}
            className="flex items-center gap-1.5 py-1.5 px-3 border-red-200 text-red-700 bg-white hover:bg-red-50 rounded-lg text-xs font-medium shadow-xs transition-all"
          >
            <Eye size={14} className="text-red-600" />
            <span className="text-xs font-medium">View Revoke Form</span>
          </Button>
        )}
      </div>

      {/* Metadata Grid */}
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-red-50/20 text-xs sm:text-sm">
        <div className="flex flex-col gap-1 bg-white p-3 rounded-lg border border-red-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-gray-500 font-medium text-[11px] uppercase tracking-wider">
            Requested By
          </span>
          <span className="text-gray-800 font-semibold truncate text-sm">
            {revoke.requested_by_name || revoke.requested_by || "—"}
          </span>
          {revoke.requested_by_name && revoke.requested_by && revoke.requested_by_name !== revoke.requested_by && (
            <span className="text-gray-400 text-[11px] truncate">
              {revoke.requested_by}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 bg-white p-3 rounded-lg border border-red-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="text-gray-500 font-medium text-[11px] uppercase tracking-wider">
            Requested On
          </span>
          <span className="text-gray-800 font-semibold text-sm">
            {formattedDate}
          </span>
        </div>

        {revoke.reason && (
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1 bg-white p-3 rounded-lg border border-red-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="text-gray-500 font-medium text-[11px] uppercase tracking-wider">
              Reason
            </span>
            <span
              className="text-gray-700 italic text-sm line-clamp-2"
              title={revoke.reason}
            >
              &ldquo;{revoke.reason}&rdquo;
            </span>
          </div>
        )}
      </div>

      {/* Revocation Approval Stages Accordion / Sub-section */}
      {hasStages ? (
        <div className="border-t border-red-100">
          <button
            type="button"
            onClick={() => setStagesExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-red-50/50 to-white hover:from-red-50/80 hover:to-red-50/30 transition-all duration-200 group border-l-[3px] border-l-red-500 text-left"
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[13px] sm:text-[14px] font-semibold text-gray-800">
                Revocation Approval Flow
              </span>
              <div className="flex items-center gap-2">
                {stageCounts.completed > 0 && (
                  <span className="text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200/60 px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    {stageCounts.completed} completed
                  </span>
                )}
                {stageCounts.pending > 0 && (
                  <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {stageCounts.pending} pending
                  </span>
                )}
                {stageCounts.rejected > 0 && (
                  <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200/60 px-2.5 py-0.5 rounded-xl inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {stageCounts.rejected} rejected
                  </span>
                )}
                {stageCounts.completed === 0 &&
                  stageCounts.pending === 0 &&
                  stageCounts.rejected === 0 && (
                    <span className="text-[11px] font-medium text-gray-500 bg-gray-100 border border-gray-200/60 px-2.5 py-0.5 rounded-xl">
                      {stageCounts.total} stages
                    </span>
                  )}
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-red-100 flex items-center justify-center transition-colors duration-200 shrink-0 ml-3">
              <ChevronDown
                size={16}
                className={`text-gray-500 group-hover:text-red-600 transition-all duration-300 ${
                  stagesExpanded ? "rotate-180" : "rotate-0"
                }`}
              />
            </div>
          </button>
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              stagesExpanded ? "opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="border-t border-gray-100">
              <FlowTable
                data={{
                  approval_status: revoke.status,
                  approval_stages: revoke.approval_stages || [],
                  initiator_forms: revoke.revoke_forms || [],
                }}
                noPadding={true}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RevokeDetailsSection;
