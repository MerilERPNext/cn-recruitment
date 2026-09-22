import React from "react";
import { ChevronRight } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";

interface TaskRequestRowProps {
  label: string;
  count: number;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}

export const TaskRequestRow: React.FC<TaskRequestRowProps> = ({
  label,
  count,
  onClick,
  icon: Icon,
}) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between p-4 md:p-5 rounded-2xl border border-gray-200/80 bg-white shadow-xs hover:shadow-md hover:border-primary-200 hover:bg-slate-50/50 transition-all duration-150 cursor-pointer group active:scale-[0.99]"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Typography
            variant="body"
            className="font-semibold text-gray-800 text-sm md:text-base group-hover:text-primary-700 transition-colors"
          >
            {label}
          </Typography>
          {count > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-gray-100 group-hover:bg-primary-100 text-gray-600 group-hover:text-primary-700 transition-colors">
              <Typography
                variant="caption"
                className="font-semibold leading-none text-inherit text-[11px]"
              >
                {count}
              </Typography>
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center pl-2 flex-shrink-0">
        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
};

export default TaskRequestRow;
