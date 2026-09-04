import { Typography } from "../../../../shared/atoms/Typography";

export type EligibilityBreakdownItem = {
  label: string;
  value: number;
  percent: number;
};

type EligibilitySummaryAsideProps = {
  breakdown: EligibilityBreakdownItem[];
};

const EligibilitySummaryAside = ({
  breakdown,
}: EligibilitySummaryAsideProps) => {
  return (
    <aside className="min-w-0 space-y-4">
      <section className="overflow-hidden rounded-lg bg-primary p-4 text-white shadow-sm sm:p-5">
        <Typography
          variant="caption"
          className="block font-bold uppercase tracking-wider text-white"
        >
          Matching employees
        </Typography>
        <div className="mt-2 text-5xl font-bold leading-none sm:text-6xl text-white">
          2,140
        </div>
        <Typography
          variant="bodyMedium"
          className="mt-2 text-sm font-semibold text-white/90"
        >
          ↑ 86 since you last viewed
        </Typography>
        <div className="mt-5 grid grid-cols-1 gap-3 rounded-lg bg-white/15 p-3 min-[380px]:grid-cols-2 sm:mt-6 text-white">
          <div>
            <div className="text-xl font-bold">2,183</div>
            <div className="text-xs font-semibold text-white/90">
              Matched rule
            </div>
          </div>
          <div>
            <div className="text-xl font-bold">43</div>
            <div className="text-xs font-semibold text-white/90">Excluded</div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <Typography
          variant="caption"
          color="body2"
          className="mb-4 block font-bold uppercase tracking-wider"
        >
          Breakdown
        </Typography>
        <div className="space-y-3">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-text-body2">
                <span>{item.label}</span>
                <span>
                  {item.value} · {item.percent}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-md bg-slate-500/20">
                <div
                  className="h-full rounded-md bg-primary"
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
