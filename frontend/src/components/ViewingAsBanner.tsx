import React from "react";
import { X, ExternalLink, Boxes } from "lucide-react";
import { Link } from "react-router-dom";
import { useTargetUser } from "../context/ViewedUserContext";
import { useEmployee } from "../hooks/useEmployee";
import Tooltip from "./shared/Tooltip";
import { MdLocationPin } from "react-icons/md";

const ViewingAsBanner: React.FC = () => {
  const { targetEmployeeId, isViewingOtherUser, clearTargetEmployee } =
    useTargetUser();
  const { data: targetEmployee } = useEmployee(targetEmployeeId);
  if (!isViewingOtherUser || !targetEmployee) {
    return null;
  }
  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">

        {/* Top Row (Name + link) */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse shrink-0" />

          <Link
            to={`/webapp/employee-profile?target_user=${targetEmployeeId}`}
            className="text-sm font-semibold text-text-title truncate hover:underline hover:text-primary transition-colors"
          >
            {targetEmployee?.employee_name + ` (${targetEmployee?.name})` || targetEmployee?.name}
          </Link>

          <Link
            to={`/webapp/employee-profile?target_user=${targetEmployeeId}`}
            className="shrink-0 inline-flex items-center justify-center text-primary hover:text-primary-hover transition-colors"
          >
            <ExternalLink className="size-4" />
          </Link>
        </div>

        {/* Bottom Row (Meta info) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-body2">

          <Tooltip content="Department">
            <span className="flex items-center gap-1 hover:text-text-title transition-colors">
              <Boxes className="size-4 shrink-0 text-primary" />
              <span className="truncate">{targetEmployee?.department_name}</span>
            </span>
          </Tooltip>

          {targetEmployee?.branch_name && <Tooltip content="Location">
            <span className="flex items-center gap-1 hover:text-text-title transition-colors">
              <MdLocationPin className="size-4 shrink-0 text-primary" />
              <span className="truncate">{targetEmployee?.branch_name}</span>
            </span>
          </Tooltip>}

        </div>
      </div>
      <button
        onClick={clearTargetEmployee}
        className="flex items-center gap-1.5 text-sm font-medium text-text-title hover:text-primary bg-card/70 hover:bg-card border border-border px-3 py-1 rounded-lg transition-all shadow-sm"
        aria-label="Exit viewing mode"
      >
        <X className="w-4 h-4 text-primary" />
        <span>Exit View</span>
      </button>
    </div>
  );
};

export default ViewingAsBanner;
