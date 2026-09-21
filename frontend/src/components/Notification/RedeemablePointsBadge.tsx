import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import { useTargetUser } from "../../context/ViewedUserContext";
import {
  useEmployeePoints,
  useRecognitionFlags,
} from "../../services/recognitionService";

interface RedeemablePointsBadgeProps {
  className?: string;
  variant?: "dark" | "light";
}

/**
 * Redeemable points pill for the top bar, next to the notification bell.
 * Sources the balance from the same API as Recognition > Vibe > Points
 * Summary (`get_employee_points`.`available_points`) so the number always
 * matches that page. Renders nothing while loading, when the Points Summary
 * feature itself is hidden (Advanced Settings), or when the employee has no
 * points available to redeem — this is a call-out for existing points, not a
 * permanent fixture.
 */
export default function RedeemablePointsBadge({
  className = "",
  variant = "dark",
}: RedeemablePointsBadgeProps) {
  const navigate = useNavigate();
  const flags = useRecognitionFlags();

  const { data: user } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const employeeId = targetEmployeeId || user?.employee || "";

  const { data: pointsData } = useEmployeePoints({ employee: employeeId });
  const availablePoints = pointsData?.available_points ?? 0;

  if (!flags.loaded || flags.hideRewardsPointSummary) return null;
  if (!employeeId || availablePoints <= 0) return null;

  const baseTheme =
    variant === "light"
      ? "bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200/60 shadow-xs"
      : "bg-white/15 hover:bg-white/25 text-white";

  return (
    <button
      type="button"
      onClick={() => navigate("/webapp/recognition/vibe/earned-points")}
      title="Points Summary"
      className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold transition-colors flex-shrink-0 ${baseTheme} ${className}`}
    >
      <Coins className={variant === "light" ? "size-3.5 sm:size-4 text-primary-600" : "size-3.5 sm:size-4"} />
      <span>
        {availablePoints.toLocaleString("en-IN")} Points
      </span>
    </button>
  );
}
