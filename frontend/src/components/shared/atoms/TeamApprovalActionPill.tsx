"use client";

import { Check, X, SendToBack } from "lucide-react";
import { JSX } from "react";
import Tooltip from "../Tooltip";

type TeamApprovalActionPillProps = {
  actions: string[];
  status: string;
  recordId: string;
  loadingAction?: { id: string; action: string } | null;
  onAction: (action: string) => void;
};

/* ===============================
   ACTION → ICON CONFIG (EXTENSIBLE)
================================ */

const ACTION_CONFIG: Record<
  string,
  {
    tooltip: string;
    icon: JSX.Element;
  }
> = {
  approve: {
    tooltip: "Approve",
    icon: <Check className="w-4 h-w-4 text-green-600" strokeWidth={2} />,
  },
  reject: {
    tooltip: "Reject",
    icon: <X className="w-4 h-w-4 text-red-500" strokeWidth={2} />,
  },
  sendback: {
    tooltip: "Send Back",
    icon: <SendToBack className="w-4 h-w-4 text-amber-600" strokeWidth={2} />,
  },
};

const normalizeAction = (action: string) =>
  action.toLowerCase().replace(/\s+/g, "");

const TeamApprovalActionPill = ({
  actions,
  status,
  recordId,
  loadingAction,
  onAction,
}: TeamApprovalActionPillProps) => {
  const isActionable = status === "Open" && actions?.length > 0;

  if (!isActionable) {
    return (
      <div
        className="
          h-8
          px-3
          flex items-center justify-center
          rounded-md
          bg-gray-10
          text-gray-600
          text-xs
          font-medium
          w-fit
        "
      >
        Action Taken
      </div>
    );
  }

  /* ✅ FIX STARTS HERE (DATA ONLY) */
  const visibleActions = actions
    .map((action) => ({
      original: action, // <-- API SAFE
      normalized: normalizeAction(action), // <-- UI SAFE
    }))
    .filter(({ normalized }) => ACTION_CONFIG[normalized]);
  /* ✅ FIX ENDS HERE */

  return (
    <div
      className="
          h-8
          flex items-center
          gap-1
          px-3
          py-1
          rounded-3xl
          bg-gray-10
          w-fit
        "
    >
      {visibleActions.map(({ original, normalized }, index) => {
        const meta = ACTION_CONFIG[normalized];
        const isLoading =
          loadingAction?.id === recordId &&
          normalizeAction(loadingAction.action) === normalized;

        return (
          <div key={normalized} className="flex items-center gap-2">
            <Tooltip content={meta.tooltip} position="top">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAction(original); // ✅ ORIGINAL STRING SENT
                }}
                disabled={isLoading}
                className="flex items-center justify-center"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border border-gray-400 border-t-transparent rounded-3xl animate-spin" />
                ) : (
                  meta.icon
                )}
              </button>
            </Tooltip>

            {index < visibleActions.length - 1 && (
              <span className="w-px h-4 bg-gray-300" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TeamApprovalActionPill;
