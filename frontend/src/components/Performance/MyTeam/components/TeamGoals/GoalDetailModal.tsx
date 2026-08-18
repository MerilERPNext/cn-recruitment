import React, { useState } from "react";
import { X } from "lucide-react";
import { useScreenSize } from "../../../../../hooks/useScreenSize";
import Button from "../../../../shared/atoms/Button";
import { Typography } from "../../../../shared/atoms/Typography";
import Badge from "../../../../shared/Badge";
import Modal from "../../../../shared/Modal";
import Avatar from "../../../../shared/Avatar";
import { GoalDetailData } from "../../types";

interface GoalDetailModalProps {
  goal: GoalDetailData;
  onClose: () => void;
  onApprove: () => void;
}

const getInitialsBg = (initials: string) => {
  const map: Record<string, string> = {
    PM: "bg-purple-100 text-purple-700",
    KI: "bg-blue-100 text-blue-700",
    AB: "bg-green-100 text-green-700",
    MS: "bg-orange-100 text-orange-700",
  };
  return map[initials] || "bg-gray-200 text-gray-700";
};

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  goal,
  onClose,
  onApprove,
}) => {
  const [comment, setComment] = useState(goal.managerComment);
  const { isMobile } = useScreenSize();

  return (
    <Modal isOpen onClose={onClose} size="md">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex flex-wrap gap-2 items-center mt-1">
            <Badge
              label={`${goal.type} · ${goal.label}`}
              backgroundColor="bg-purple-50 text-purple-700"
              size="sm"
            />
            <Badge
              label={goal.status}
              backgroundColor="bg-yellow-50 text-yellow-700"
              size="sm"
            />
            <Badge
              label={goal.approvalStatus}
              backgroundColor="bg-orange-50 text-orange-600"
              size="sm"
            />
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
          {/* Title + Employee */}
          <div>
            <Typography variant="h3" className="text-gray-900 mb-2">
              {goal.title}
            </Typography>
            <div className="flex items-center gap-2">
              <Avatar
                name={goal.employeeName}
                fontSize="text-xs"
                size="h-8 w-8"
                avatarBgColor={
                  getInitialsBg(goal.employeeInitials).split(" ")[0]
                }
                avatarTextColor={
                  getInitialsBg(goal.employeeInitials).split(" ")[1]
                }
              />
              <Typography variant="bodySmall" className="text-gray-500">
                {goal.employeeName} · {goal.designation} · submitted{" "}
                {goal.submittedAgo}
              </Typography>
            </div>
          </div>

          {/* Meta Grid */}
          <div
            className={`grid ${isMobile ? "grid-cols-2" : "grid-cols-4"} gap-6`}
          >
            {[
              { label: "WEIGHTAGE", value: `${goal.weightage}%` },
              { label: "START", value: goal.start },
              { label: "END", value: goal.end },
              { label: "METRIC", value: goal.metric },
              { label: "ALIGNED TO", value: goal.alignedTo },
              { label: "CONTRIBUTION", value: goal.contribution },
              { label: "VISIBILITY", value: goal.visibility },
              { label: "AUTO-PULL", value: goal.autoPull },
            ].map((item) => (
              <div key={item.label}>
                <Typography
                  variant="caption"
                  className="text-gray-400 uppercase tracking-wider block mb-1 font-semibold"
                >
                  {item.label}
                </Typography>
                <Typography
                  variant="bodySmall"
                  className="font-semibold text-gray-800"
                >
                  {item.value}
                </Typography>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <Typography
              variant="bodySmall"
              className="font-medium text-gray-900 mb-2 block"
            >
              Description
            </Typography>
            <div className="bg-[#f8fafc] border border-gray-100 rounded-xl p-4">
              <Typography variant="bodySmall" className="text-gray-600">
                {goal.description}
              </Typography>
            </div>
          </div>

          {/* Key Results */}
          <div>
            <Typography
              variant="bodySmall"
              className="font-medium text-gray-900 mb-3 block"
            >
              Key Results ({goal.keyResults.length})
            </Typography>
            <div className="space-y-2">
              {goal.keyResults.map((kr) => (
                <div
                  key={kr.id}
                  className="flex items-center justify-between gap-3 py-3 px-4 border border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge label={kr.id} variant="purple-outline" size="sm" />
                    <Typography
                      variant="bodySmall"
                      className="text-gray-800 font-medium"
                    >
                      {kr.title}
                    </Typography>
                  </div>
                  <Typography
                    variant="caption"
                    className="text-gray-500 shrink-0"
                  >
                    Target {kr.target}
                  </Typography>
                </div>
              ))}
            </div>
          </div>

          {/* Add Comment */}
          <div>
            <Typography
              variant="bodySmall"
              className="font-medium text-gray-900 mb-2 block"
            >
              Add comment{" "}
              <span className="text-gray-400 font-normal">
                (visible to {goal.employeeName.split(" ")[0]})
              </span>
            </Typography>
            <textarea
              aria-label={`Add comment for ${goal.employeeName}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
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
            <Typography variant="bodySmall" className="text-gray-500">
              {goal.auditLog}
            </Typography>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-1px_2px_rgba(15,23,42,0.04)]">
          <Typography variant="caption" className="text-gray-500">
            Auto-approves in {goal.autoApprovesInDays} days
          </Typography>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              bgColor="text"
              size="sm"
              onClick={onClose}
              className="h-9 w-[92px] bg-white px-0 text-xs font-semibold"
            >
              Send back
            </Button>
            <Button
              variant="outline"
              bgColor="error"
              size="sm"
              className="h-9 w-[70px] bg-white px-0 text-xs font-semibold"
            >
              Reject
            </Button>
            <Button
              variant="contain"
              bgColor="success"
              size="sm"
              onClick={onApprove}
              className="h-9 w-[110px] px-0 text-xs font-semibold"
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
