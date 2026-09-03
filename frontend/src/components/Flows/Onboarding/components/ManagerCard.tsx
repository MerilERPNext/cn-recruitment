import { memo } from "react";
import Avatar from "../../../shared/Avatar";
import { Typography } from "../../../shared/atoms/Typography";
import { OnboardingPerson } from "../../../../types/onboarding";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";

interface ManagerCardProps {
  manager?: OnboardingPerson | null;
  isLoading?: boolean;
}

const ManagerCard = ({ manager, isLoading }: ManagerCardProps) => (
  <div className="bg-white rounded-2xl border border-border shadow-sm p-4 sm:p-6 space-y-4">
    <div className="flex justify-between items-center">
      <Typography variant="bodyMedium" className="font-bold text-text-title">
        Manager
      </Typography>
    </div>

    {isLoading ? (
      <div className="flex gap-3 sm:gap-4 items-start animate-pulse">
        <div className="h-14 w-14 rounded-full bg-gray-200 shrink-0" />
        <div className="min-w-0 space-y-2 flex-1 pt-2">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    ) : manager ? (
      <div className="flex gap-3 sm:gap-4 items-start">
        <Avatar
          name={manager.full_name || manager.employee || ""}
          src={manager.image || ""}
          size="h-14 w-14 shrink-0"
        />
        <div className="min-w-0 space-y-1">
          <WrapperHoverCard employeeId={manager.employee ?? ""}>
            <Typography variant="body" className="font-bold text-text-title leading-tight block break-words hover:underline cursor-pointer">
              {manager.full_name || manager.employee || "-"}
            </Typography>
          </WrapperHoverCard>
          <Typography variant="caption" className="text-text-body2 leading-relaxed block break-words">
            {manager.subtitle || "-"}
          </Typography>
        </div>
      </div>
    ) : (
      <div className="pt-2">
        <Typography variant="bodySmall" className="text-slate-400 italic">
          Not assigned yet
        </Typography>
      </div>
    )}
  </div>
);

export default memo(ManagerCard);
