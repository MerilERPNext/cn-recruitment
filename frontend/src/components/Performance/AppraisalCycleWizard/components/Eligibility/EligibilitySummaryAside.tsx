import { Typography } from "../../../../shared/atoms/Typography";

export type EligibilityBreakdownItem = {
  label: string;
  value: number;
  percent: number;
};

type EligibilitySummaryAsideProps = {
  breakdown: EligibilityBreakdownItem[];
};

const EligibilitySummaryAside = ({ breakdown }: EligibilitySummaryAsideProps) => {
  return (
    <aside className="min-w-0 space-y-4">
      <section className="overflow-hidden rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 p-4 text-white shadow-sm sm:p-5">
        <Typography
          variant="caption"
          className="block font-bold uppercase tracking-wider text-white"
        >
          Matching employees
        </Typography>
        <div className="mt-2 text-5xl font-bold leading-none sm:text-6xl">2,140</div>
        <Typography variant="bodyMedium" className="mt-2 text-sm font-semibold text-blue-50">
          ↑ 86 since you last viewed
        </Typography>
        <div className="mt-5 grid grid-cols-1 gap-3 rounded-lg bg-white/15 p-3 min-[380px]:grid-cols-2 sm:mt-6">
          <div>
            <div className="text-xl font-bold">2,183</div>
            <div className="text-xs font-semibold text-blue-50">Matched rule</div>
          </div>
          <div>
            <div className="text-xl font-bold">43</div>
            <div className="text-xs font-semibold text-blue-50">Excluded</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <Typography
          variant="caption"
          className="mb-4 block font-bold uppercase tracking-wider text-gray-500"
        >
          Breakdown
        </Typography>
        <div className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-gray-600">
                <span>{item.label}</span>
                <span>
                  {item.value} · {item.percent}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-md bg-gray-100">
                <div
                  className="h-full rounded-md bg-blue-500"
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};

export default EligibilitySummaryAside;
