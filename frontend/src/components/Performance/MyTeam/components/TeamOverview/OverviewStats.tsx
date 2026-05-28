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
    <section className={`grid ${isCompact ? "grid-cols-2" : "grid-cols-5"} gap-4`}>
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-gray-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[100px]"
        >
          <Typography
            variant="caption"
            className="text-gray-400 uppercase tracking-wider block font-semibold text-[10px] mb-2"
          >
            {stat.label}
          </Typography>
          <div>
            <Typography
              variant="h2"
              className={`${stat.valueColor} leading-none mb-1 font-bold tracking-tight text-2xl`}
            >
              {stat.value}
            </Typography>
            <Typography variant="caption" className="text-gray-500">
              {stat.sub}
            </Typography>
          </div>
        </div>
      ))}
    </section>
  );
};

export default OverviewStats;
