import { ApexOptions } from "apexcharts";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import { Switch } from "../../shared/atoms/Switch";
import { Typography } from "../../shared/atoms/Typography";

const modes = [
  {
    id: "soft",
    title: "Soft target distribution",
    desc: "Admin sets target % per bucket. System flags managers outside ±5%. No hard cap.",
    subtitle: "Low friction",
    recommended: true,
  },
  {
    id: "hard",
    title: "Hard forced bell curve",
    desc: "System enforces caps at release. Manager must rebalance before submit.",
    subtitle: "Indian enterprise norm",
    recommended: false,
  },
  {
    id: "calib",
    title: "Calibration-meeting led",
    desc: "No constraint. Calibrators override with reason in session.",
    subtitle: "Highest trust required",
    recommended: false,
  },
];

const initialDistributions = [
  {
    id: "outstanding",
    label: "Outstanding",
    actual: 13,
    outside: true,
  },
  { id: "exceeds", label: "Exceeds", actual: 25, outside: true },
  { id: "meets", label: "Meets", actual: 37, outside: false },
  { id: "below", label: "Below", actual: 13, outside: false },
  {
    id: "unsatisfactory",
    label: "Unsatisfactory",
    actual: 12,
    outside: true,
  },
];

const Normalisation = () => {
  const [activeMode, setActiveMode] = useState("soft");
  const [nineBoxEnabled, setNineBoxEnabled] = useState(true);
  const [targets, setTargets] = useState({
    unsatisfactory: 5,
    below: 15,
    meets: 60,
    exceeds: 15,
    outstanding: 5,
  });

  const handleTargetChange = (key: keyof typeof targets, value: string) => {
    const num = parseInt(value, 10);
    setTargets({ ...targets, [key]: isNaN(num) ? 0 : num });
  };

  const distributionChartData = useMemo(
    () =>
      [...initialDistributions].reverse().map((dist) => ({
        ...dist,
        target: targets[dist.id as keyof typeof targets],
      })),
    [targets],
  );

  const distributionChartOptions: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "bar",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: ["#64748b", "#3b82f6", "#ef4444"],
      dataLabels: { enabled: false },
      grid: {
        borderColor: "rgba(148, 163, 184, 0.1)",
        strokeDashArray: 4,
      },
      legend: {
        position: "bottom",
        horizontalAlign: "center",
        fontSize: "12px",
        labels: { colors: "#94a3b8" },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: "52%",
        },
      },
      tooltip: {
        y: {
          formatter: (value) => `${value}%`,
        },
      },
      xaxis: {
        categories: distributionChartData.map((dist) => dist.label),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: "#94a3b8",
            fontSize: "11px",
            fontWeight: 700,
          },
        },
      },
      yaxis: {
        min: 0,
        max: 60,
        tickAmount: 4,
        labels: {
          style: { colors: "#94a3b8", fontSize: "11px" },
          formatter: (value) => `${Math.round(value)}%`,
        },
      },
    }),
    [distributionChartData],
  );

  const distributionChartSeries = useMemo(
    () => [
      {
        name: "Target distribution",
        data: distributionChartData.map((dist) => dist.target),
      },
      {
        name: "Actual",
        data: distributionChartData.map((dist) =>
          dist.outside ? null : dist.actual,
        ),
      },
      {
        name: "Outside band",
        data: distributionChartData.map((dist) =>
          dist.outside ? dist.actual : null,
        ),
      },
    ],
    [distributionChartData],
  );

  return (
    <>
      {/* Normalisation Mode */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <Typography
          variant="h3"
          className="text-base font-bold text-text-title mb-1"
        >
          Normalisation Mode
        </Typography>
        <Typography variant="caption" color="body2" className="block mb-6">
          Determines whether ratings are constrained at release
        </Typography>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modes.map((mode) => (
            <div
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`relative cursor-pointer rounded-xl border p-4 transition-all flex flex-col justify-between min-h-[160px] ${
                activeMode === mode.id
                  ? "border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(59,130,246,1)]"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <Typography
                    variant="bodyMedium"
                    className="font-bold text-text-title pr-2"
                  >
                    {mode.title}
                  </Typography>
                  {mode.recommended && (
                    <span className="shrink-0 text-[10px] font-bold text-emerald-500 bg-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wide">
                      Recommended
                    </span>
                  )}
                </div>
                <Typography
                  variant="caption"
                  color="body2"
                  className="block mb-4"
                >
                  {mode.desc}
                </Typography>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <Typography variant="caption" color="body2">
                  {mode.subtitle}
                </Typography>
                {activeMode === mode.id && (
                  <div className="flex items-center gap-1 text-primary text-xs font-bold">
                    <Check className="h-3.5 w-3.5" />
                    Active
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Target Distribution */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <Typography
          variant="h3"
          className="text-base font-bold text-text-title mb-1"
        >
          Target distribution
        </Typography>
        <Typography variant="caption" color="body2" className="block mb-8">
          Per-bucket targets across 2,140 eligible employees
        </Typography>

        <div className="mb-10 w-full overflow-x-auto pb-4">
          <div className="min-w-[560px]">
            <Chart
              options={distributionChartOptions}
              series={distributionChartSeries}
              type="bar"
              height={280}
            />
          </div>
        </div>

        {/* Target Inputs */}
        <div className="rounded-lg bg-slate-500/10 p-4 border border-border">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-body2 uppercase tracking-wider">
                Unsatisfactory
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targets.unsatisfactory}
                  onChange={(e) =>
                    handleTargetChange("unsatisfactory", e.target.value)
                  }
                  className="w-full rounded-md border border-border bg-card py-1.5 px-3 pr-8 text-right text-sm font-bold text-text-title focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-body2">
                  %
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-body2 uppercase tracking-wider">
                Below
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targets.below}
                  onChange={(e) => handleTargetChange("below", e.target.value)}
                  className="w-full rounded-md border border-border bg-card py-1.5 px-3 pr-8 text-right text-sm font-bold text-text-title focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-body2">
                  %
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-body2 uppercase tracking-wider">
                Meets
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targets.meets}
                  onChange={(e) => handleTargetChange("meets", e.target.value)}
                  className="w-full rounded-md border border-border bg-card py-1.5 px-3 pr-8 text-right text-sm font-bold text-text-title focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-body2">
                  %
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-body2 uppercase tracking-wider">
                Exceeds
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targets.exceeds}
                  onChange={(e) =>
                    handleTargetChange("exceeds", e.target.value)
                  }
                  className="w-full rounded-md border border-border bg-card py-1.5 px-3 pr-8 text-right text-sm font-bold text-text-title focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-body2">
                  %
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-body2 uppercase tracking-wider">
                Outstanding
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={targets.outstanding}
                  onChange={(e) =>
                    handleTargetChange("outstanding", e.target.value)
                  }
                  className="w-full rounded-md border border-border bg-card py-1.5 px-3 pr-8 text-right text-sm font-bold text-text-title focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-body2">
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9-Box Talent Grid */}
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Typography
              variant="h3"
              className="text-base font-bold text-text-title mb-1"
            >
              9-Box Talent Grid
            </Typography>
            <Typography variant="caption" color="body2" className="block">
              Performance × Potential — labels and promotion filters
            </Typography>
          </div>
          <Switch
            checked={nineBoxEnabled}
            onCheckedChange={() => setNineBoxEnabled(!nineBoxEnabled)}
          />
        </div>

        <div
          className={`grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-8 xl:gap-12 transition-opacity duration-300 ${!nineBoxEnabled ? "opacity-40 pointer-events-none" : ""}`}
        >
          {/* Grid Left Panel */}
          <div className="w-full max-w-[450px]">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 sm:gap-3">
              {/* Row 1 (High Potential) */}
              <div className="flex items-center justify-center w-6 sm:w-8">
                <span className="text-[10px] font-bold text-text-body2 uppercase tracking-widest whitespace-nowrap -rotate-90 block">
                  High Potential
                </span>
              </div>
              <div className="aspect-square sm:aspect-[4/3] rounded-lg border p-2 sm:p-3 flex flex-col justify-between bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  Star 1
                </span>
                <span className="text-[10px] sm:text-xs opacity-70 font-medium">
                  64 emp
                </span>
              </div>
              <div className="aspect-square sm:aspect-[4/3] rounded-lg border p-2 sm:p-3 flex flex-col justify-between bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  Star 2
                </span>
                <span className="text-[10px] sm:text-xs opacity-70 font-medium">
                  71 emp
                </span>
              </div>
              <div className="aspect-square sm:aspect-[4/3] rounded-lg border p-2 sm:p-3 flex flex-col justify-between bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  Star 3
                </span>
                <span className="text-[10px] sm:text-xs opacity-70 font-medium">
                  65 emp
                </span>
              </div>
              {/* Row 2 (Mid Potential) */}
              <div className="flex items-center justify-center w-6 sm:w-8">
                <span className="text-[10px] font-bold text-text-body2 uppercase tracking-widest whitespace-nowrap -rotate-90 block">
                  Mid Potential
                </span>
              </div>
              <div className="aspect-square sm:aspect-[4/3] rounded-lg border p-2 sm:p-3 flex flex-col justify-between bg-card border-border text-text-title">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  Solid
                </span>
                <span className="text-[10px] sm:text-xs opacity-70 font-medium">
                  45 emp
                </span>
              </div>
              <div className="aspect-square sm:aspect-[4/3] rounded-lg border p-2 sm:p-3 flex flex-col justify-between bg-card border-border text-text-title">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  Solid
                </span>
                <span className="text-[10px] sm:text-xs opacity-70 font-medium">
                  35 emp
                </span>
              </div>
              <div className="aspect-square sm:aspect-[4/3] rounded-lg border p-2 sm:p-3 flex flex-col justify-between bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  Star
                </span>
                <span className="text-[10px] sm:text-xs opacity-70 font-medium">
                  82 emp
                </span>
              </div>
              {/* Row 3 (Low Potential) */}
              <div className="flex items-center justify-center w-6 sm:w-8">
                <span className="text-[10px] font-bold text-text-body2 uppercase tracking-widest whitespace-nowrap -rotate-90 block">
                  Low Potential
                </span>
              </div>
              <div className="aspect-square sm:aspect-[4/3] rounded-lg border p-2 sm:p-3 flex flex-col justify-between bg-red-500/20 border-red-500/30 text-red-400">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  At Risk
                </span>
                <span className="text-[10px] sm:text-xs opacity-70 font-medium">
                  93 emp
                </span>
              </div>
              <div className="aspect-square sm:aspect-[4/3] rounded-lg border p-2 sm:p-3 flex flex-col justify-between bg-card border-border text-text-title">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  Solid
                </span>
                <span className="text-[10px] sm:text-xs opacity-70 font-medium">
                  70 emp
                </span>
              </div>
              <div className="aspect-square sm:aspect-[4/3] rounded-lg border p-2 sm:p-3 flex flex-col justify-between bg-card border-border text-text-title">
                <span className="text-xs sm:text-sm font-bold leading-tight">
                  Future Star
                </span>
                <span className="text-[10px] sm:text-xs opacity-70 font-medium">
                  54 emp
                </span>
              </div>
              {/* Row 4 (X-Axis Labels) */}
              <div></div> {/* Empty corner */}
              <div className="flex items-center justify-center pt-1">
                <span className="text-[10px] font-bold text-text-body2 uppercase tracking-widest text-center">
                  Low Perf
                </span>
              </div>
              <div className="flex items-center justify-center pt-1">
                <span className="text-[10px] font-bold text-text-body2 uppercase tracking-widest text-center">
                  Mid Perf
                </span>
              </div>
              <div className="flex items-center justify-center pt-1">
                <span className="text-[10px] font-bold text-text-body2 uppercase tracking-widest text-center">
                  High Perf
                </span>
              </div>
            </div>
          </div>

          {/* Filters Right Panel */}
          <div className="flex flex-col">
            <Typography
              variant="caption"
              color="body2"
              className="font-bold uppercase tracking-wider mb-4"
            >
              Promotion Eligibility Filters
            </Typography>

            <div className="flex flex-col gap-3 mb-6">
              {[
                "Years in organisation ≥ 1.5",
                "Last 2 cycles ≥ Meets",
                "Current cycle rating ≥ Exceeds",
                "Not currently on PIP",
                "In a band with promotion budget",
              ].map((filter, index) => (
                <label
                  key={index}
                  className="flex items-center gap-3 cursor-pointer group bg-primary/10 p-2.5 rounded-lg border border-primary/30 hover:border-primary/50 transition-colors"
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-primary bg-primary">
                    <Check className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-text-title">
                    {filter}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-auto rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/30">
              <Typography
                variant="bodySmall"
                className="text-emerald-400 font-medium"
              >
                <span className="font-bold text-emerald-400">184 employees</span> will be
                eligible for promotion review with these filters
              </Typography>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Normalisation;
