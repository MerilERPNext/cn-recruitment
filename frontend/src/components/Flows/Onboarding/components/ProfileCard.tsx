import { memo } from "react";
import { Mail, Phone } from "lucide-react";
import Avatar from "../../../shared/Avatar";
import Badge from "../../../shared/Badge";
import { Typography } from "../../../shared/atoms/Typography";
import { EmployeeOnboardingDetail } from "../../../../types/onboarding";
import WrapperHoverCard from "../../../shared/WrapperHoverCard";

interface ProfileCardProps {
  header?: EmployeeOnboardingDetail["header"];
}

const ProfileCard = ({ header }: ProfileCardProps) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
    <Avatar
      name={header?.employee_name || "Unknown"}
      src=""
      size="h-24 w-24"
      indicatorPositionClass="absolute bottom-0 right-0"
    />

    <div className="min-w-0 flex-1 text-center md:text-left space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2.5">
        <WrapperHoverCard employeeId={header?.employee_id ?? ""}>
          <Typography variant="h4" className="font-bold text-slate-800 break-words hover:underline cursor-pointer">
            {header?.employee_name || "Employee"}
          </Typography>
        </WrapperHoverCard>
        <div className="flex justify-center">
          <Badge label="On Probation" variant="success" size="sm" />
        </div>
      </div>

      <Typography
        variant="bodySmall"
        className="text-slate-500 block leading-relaxed break-words"
      >
        {header?.employee_id || "-"} <span className="mx-1 text-slate-300">|</span> {header?.department_label || header?.department || "-"}
        <span className="mx-1 text-slate-300">|</span> {header?.current_office_location_label || header?.current_office_location || "-"}
      </Typography>

      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-6 pt-2">
        <div className="flex items-center gap-2 text-slate-600">
          <Phone size={15} className="text-blue-500" />
          <Typography variant="bodySmall" className="font-medium text-slate-600">
            {header?.phone || "-"}
          </Typography>
        </div>

        <div className="flex items-center gap-2 text-slate-600">
          <Mail size={15} className="text-blue-500" />
          <Typography
            variant="bodySmall"
            className="font-medium text-slate-600 break-all"
          >
            {header?.email || "-"}
          </Typography>
        </div>
      </div>
    </div>
  </div>
);

export default memo(ProfileCard);
