import React, { useMemo } from "react";
import { FunnelActivityLog } from "../../../../types/separation";
import Button from "../../../shared/atoms/Button";
import useCurrentUser from "../../../../hooks/useCurrentUser";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import { Typography } from "../../../shared/atoms/Typography";
import StatusBadge from "../../../shared/atoms/statusBadge";
import { Check, Clock, X, User } from "lucide-react";

interface SeparationLogCardProps {
  gtc: string;
  data: FunnelActivityLog;
  isActive: boolean;
  onClickAction: (selected_option: string) => void;
}
const SeparationLogCard: React.FC<SeparationLogCardProps> = ({
  onClickAction,
  gtc,
  data,
  isActive,
}) => {
  // fallback: all columns equally sized

  const actions = useMemo(() => {
    try {
      return data?.action_options ? JSON.parse(data.action_options) : [];
    } catch {
      return [];
    }
  }, [data?.action_options]);

  const { data: currentUser, isLoading: loadingUser } = useCurrentUser();

  const canPerformActions = useMemo(() => {
    if (!isActive || loadingUser || !currentUser) return false;

    // Check current User name
    if (
      data?.target_type &&
      data?.target &&
      data?.target_type === "User" &&
      data?.target === currentUser?.name
    )
      return true;

    // Check current User Role
    if (
      data?.target_type === "Role" &&
      currentUser?.roles?.some((role) => role.role === data?.target)
    )
      return true;

    return false;
  }, [currentUser, data, loadingUser, isActive]);

  const { isDesktop } = useScreenSize();

  return isDesktop ? (
    <div
      className={`grid gap-4 text-center border-b border-b-gray-300 hover:bg-primary/30 px-6 py-4 items-center`}
      style={{ gridTemplateColumns: gtc }}
    >
      <Typography variant="bodySmall" className="font-semibold tracking-tight">
        {data?.idx}
      </Typography>
      <div className="inline-flex justify-center self-center">
        <StatusBadge status={data?.status} />
      </div>
      <Typography variant="bodySmall" className="font-semibold tracking-tight">
        {data?.target}
      </Typography>
      <Typography variant="bodySmall" className="font-semibold tracking-tight">
        {data?.selected_action}
      </Typography>
      <span>
        {canPerformActions &&
          actions?.map((action: string, idx: number) => (
            <Button
              key={action + idx}
              onClick={() => onClickAction(action)}
              size="md"
            >
              {action}
            </Button>
          ))}
      </span>
    </div>
  ) : (
    <div className="relative flex gap-4 w-full mb-6">
      {/* Connector Line */}
      {!data?.isLast && (
        <div
          className={`absolute top-5 left-4 -translate-x-1/2 w-0.5 bg-gray-300`}
          style={{ height: "calc(100% + 2rem)", zIndex: 0 }}
        ></div>
      )}

      {/* Circle Icon */}
      <div className="relative flex flex-col items-center">
        <div className="relative flex items-center justify-center w-8 h-8">
          {isActive && (
            <>
              <span className="absolute w-8 h-8 rounded-full bg-yellow-400/40 animate-pulse-wave"></span>
              <span className="absolute w-8 h-8 rounded-full bg-yellow-400/30 animate-pulse-wave delay-500"></span>
            </>
          )}
          <div
            className={`z-10 w-8 h-8 rounded-full flex items-center justify-center ${
              isActive
                ? "bg-yellow-500"
                : ["Completed", "Approved", "Submitted"].includes(
                      data?.status || "",
                    )
                  ? "bg-green-500"
                  : ["Failed", "Rejected"].includes(data?.status || "")
                    ? "bg-red-500"
                    : "bg-gray-400"
            }`}
          >
            {["Completed", "Approved", "Submitted"].includes(
              data?.status || "",
            ) ? (
              <Check size={14} strokeWidth={3} className="text-white" />
            ) : isActive || data?.status === "Pending" ? (
              <Clock size={14} strokeWidth={3} className="text-white" />
            ) : ["Failed", "Rejected"].includes(data?.status || "") ? (
              <X size={14} strokeWidth={3} className="text-white" />
            ) : (
              <User size={14} strokeWidth={3} className="text-white" />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-2xl border-t-4 border-x border-b border-x-primary/20 border-b-primary/20 shadow-sm border-primary px-4 py-4 transition-all">
          {/* Header: Stage & Status */}
          <div className="flex justify-between items-center gap-2 mb-3 w-full">
            <Typography
              variant="mobileCardTitle"
              className="text-gray-500 font-medium"
            >
              Stage {data?.idx}
            </Typography>
            <StatusBadge status={data?.status} />
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 w-full mb-3" />

          {/* Body: Details */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-start text-sm gap-4">
              <Typography
                variant="mobileCardLabel"
                className="block text-gray-500 shrink-0 mt-0.5"
              >
                Assigned To
              </Typography>
              <Typography
                variant="mobileCardValue"
                className="text-right flex-1 min-w-0 mt-0.5 break-words"
              >
                {data?.target || "-"}
              </Typography>
            </div>
            <div className="flex justify-between items-start text-sm gap-4">
              <Typography
                variant="mobileCardLabel"
                className="block text-gray-500 shrink-0 mt-0.5"
              >
                Selected Action
              </Typography>
              <Typography
                variant="mobileCardValue"
                className="text-right flex-1 min-w-0 mt-0.5"
              >
                {data?.selected_action || "-"}
              </Typography>
            </div>
          </div>

          {/* 3. Footer: Action Buttons */}
          {canPerformActions && actions?.length > 0 && (
            <div className="pt-4 mt-auto flex flex-wrap">
              {actions.map((action: string, index: number) => (
                <Button
                  key={index}
                  onClick={() => onClickAction(action)}
                  className="w-full justify-center py-2.5 text-sm"
                >
                  {action}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeparationLogCard;
