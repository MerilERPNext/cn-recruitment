import { Typography } from "../../../../shared/atoms/Typography";
import type { DistributionItem } from "../../types";

type DistributionSummaryProps = {
  distribution: DistributionItem[];
};

const DistributionSummary = ({ distribution }: DistributionSummaryProps) => {
  return (
    <section className="shrink-0 rounded-md border border-gray-200 bg-white px-4 py-5 shadow-sm sm:px-5">
      <Typography
        variant="caption"
        className="block font-bold uppercase tracking-wider text-gray-500"
      >
        Distribution · Soft Target
      </Typography>
      <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Typography variant="h2" className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Within +5%
          </Typography>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Target 5/15/60/15/5 · Actual 8/21/53/14/4
          </p>
        </div>
        <div className="grid flex-1 grid-cols-5 items-end gap-2 sm:gap-6 lg:max-w-[980px]">
          {distribution.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col items-center">
              <span className={`mb-1 text-xs font-bold ${item.value > 20 ? "text-rose-500" : "text-gray-600"}`}>
                {item.value}%
              </span>
              <span className={`w-8 rounded-t-md sm:w-11 ${item.height} ${item.color}`} />
              <span className="mt-1 truncate text-[11px] font-medium text-gray-600">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DistributionSummary;
