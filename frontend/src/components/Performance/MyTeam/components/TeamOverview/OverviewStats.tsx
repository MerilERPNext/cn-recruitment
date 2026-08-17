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
    <section className={`grid ${isCompact ? "grid-cols-2" : "grid-cols-5"} gap-3 sm:gap-4`}>
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="flex min-h-[96px] min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:min-h-[104px] sm:p-5"
        >
          <Typography
            variant="caption"
            className="mb-2 block break-words text-[10px] font-semibold uppercase text-slate-400"
          >
            {stat.label}
          </Typography>
          <div>
            <Typography
              variant="h2"
              className={`text-blue-600 mb-1 text-2xl font-bold leading-none`}
            >
              {stat.value}
            </Typography>
            <Typography variant="caption" className="break-words text-slate-500">
              {stat.sub}
            </Typography>
          </div>
        </div>
      ))}
    </section>
  );
};

export default OverviewStats;
