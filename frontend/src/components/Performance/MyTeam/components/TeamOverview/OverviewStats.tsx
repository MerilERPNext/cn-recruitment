import React from "react";
import { Typography } from "../../../../shared/atoms/Typography";

interface OverviewStat {
  label: string;
  value: string;
  sub: string;
  valueColor: string;
}

interface OverviewStatsProps {
  isCompact: boolean;
  stats: OverviewStat[];
}

const OverviewStats: React.FC<OverviewStatsProps> = ({ isCompact, stats }) => {
  return (
    <section className={`grid ${isCompact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 lg:grid-cols-5"} gap-2.5 sm:gap-4`}>
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="flex min-h-[92px] sm:min-h-[100px] min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm hover:border-slate-300 transition-all duration-150"
        >
          <Typography
            variant="caption"
            className="mb-1.5 block break-words text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 leading-tight tracking-wider"
          >
            {stat.label}
          </Typography>
          <div className="mt-auto">
            <Typography
              variant="h2"
              className="text-slate-900 mb-0.5 text-lg sm:text-xl font-bold leading-none tracking-tight"
            >
              {stat.value}
            </Typography>
            <Typography variant="caption" className="block break-words text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">
              {stat.sub}
            </Typography>
          </div>
        </div>
      ))}
    </section>
  );
};

export default React.memo(OverviewStats);
