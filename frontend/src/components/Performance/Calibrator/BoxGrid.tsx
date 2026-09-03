import { useState } from "react";
import { Check, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Badge from "../../shared/Badge";
import Button from "../../shared/atoms/Button";
import { Card } from "../../shared/atoms/Card";
import { Typography } from "../../shared/atoms/Typography";

type Rating = "Outstanding" | "Exceeds" | "Meets" | "Below";

type QuickPickEmployee = {
  initials: string;
  name: string;
  role: string;
  rating: Rating;
};

type BoxEmployee = {
  initials: string;
  name: string;
};

const chips = ["BU: India Tech", "Grade: L1-L5", "Tenure: any", "Promotion-eligible only"];

const boxes: {
  badgeVariant: "danger" | "info" | "purple" | "success" | "warning";
  color: string;
  count: number;
  employees: BoxEmployee[];
  label: string;
  titleColor: string;
}[] = [
  {
    label: "ENIGMA",
    count: 0,
    color: "border-purple-500/30 bg-purple-500/10",
    badgeVariant: "purple",
    titleColor: "text-purple-400",
    employees: [],
  },
  {
    label: "FUTURE STAR",
    count: 0,
    color: "border-emerald-500/30 bg-emerald-500/10",
    badgeVariant: "success",
    titleColor: "text-emerald-400",
    employees: [],
  },
  {
    label: "STAR",
    count: 6,
    color: "border-emerald-500/40 bg-emerald-500/20",
    badgeVariant: "success",
    titleColor: "text-emerald-400",
    employees: [
      { initials: "PM", name: "Pallavi M." },
      { initials: "KI", name: "Karthik I." },
      { initials: "NP", name: "Neha P." },
      { initials: "RB", name: "Riya B." },
      { initials: "PM", name: "Priya M." },
      { initials: "SR", name: "Sanjay R." },
    ],
  },
  {
    label: "INCONSISTENT",
    count: 1,
    color: "border-amber-500/30 bg-amber-500/10",
    badgeVariant: "warning",
    titleColor: "text-amber-500",
    employees: [{ initials: "VR", name: "Vikram R." }],
  },
  {
    label: "CORE PLAYER",
    count: 3,
    color: "border-primary/30 bg-primary/10",
    badgeVariant: "info",
    titleColor: "text-primary",
    employees: [
      { initials: "MS", name: "Mohit S." },
      { initials: "AB", name: "Aman B." },
      { initials: "DA", name: "Divya A." },
    ],
  },
  {
    label: "HIGH POTENTIAL",
    count: 2,
    color: "border-emerald-500/30 bg-emerald-500/10",
    badgeVariant: "success",
    titleColor: "text-emerald-400",
    employees: [
      { initials: "SD", name: "Shreya D." },
      { initials: "TM", name: "Tarun M." },
    ],
  },
  {
    label: "AT RISK",
    count: 0,
    color: "border-red-500/30 bg-red-500/10",
    badgeVariant: "danger",
    titleColor: "text-red-500",
    employees: [],
  },
  {
    label: "EFFECTIVE",
    count: 0,
    color: "border-amber-500/30 bg-amber-500/10",
    badgeVariant: "warning",
    titleColor: "text-amber-500",
    employees: [],
  },
  {
    label: "SOLID PERFORMER",
    count: 0,
    color: "border-primary/30 bg-primary/10",
    badgeVariant: "info",
    titleColor: "text-primary",
    employees: [],
  },
];

const filters = [
  { id: "years-in-org", label: "Years in org >=", value: "1.5" },
  { id: "last-two-cycles", label: "Last 2 cycles >=", value: "Meets" },
  { id: "current-rating", label: "Current rating >=", value: "Exceeds" },
  { id: "not-on-pip", label: "Not on PIP", value: "-" },
  { id: "promotion-band", label: "In promotion-eligible band", value: "-" },
];

const quickPickEmployees: QuickPickEmployee[] = [
  { initials: "PM", name: "Pallavi Mahar", role: "Design · Oxygen", rating: "Exceeds" },
  { initials: "KI", name: "Karthik Iyer", role: "Engineering · Platform", rating: "Outstanding" },
  { initials: "NP", name: "Neha Patel", role: "Product · Oxygen", rating: "Exceeds" },
  { initials: "RB", name: "Riya Banerjee", role: "Design · Oxygen", rating: "Outstanding" },
  { initials: "PM", name: "Priya Menon", role: "Research", rating: "Exceeds" },
  { initials: "SR", name: "Sanjay Roy", role: "Product · Oxygen", rating: "Outstanding" },
];

const BoxGrid = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const savedOverride = location.state?.savedOverride as
    | { employeeName: string; from: string; to: string }
    | undefined;
  const isVikramOverrideSaved = savedOverride?.employeeName === "Vikram Rao";
  const [enabledFilters, setEnabledFilters] = useState<Record<string, boolean>>(
    () =>
      filters.reduce<Record<string, boolean>>((acc, filter) => {
        acc[filter.id] = true;
        return acc;
      }, {}),
  );

  const toggleFilter = (filterId: string) => {
    setEnabledFilters((current) => ({
      ...current,
      [filterId]: !current[filterId],
    }));
  };

  return (
    <main className="min-h-dvh overflow-x-hidden bg-app p-2 font-sans text-text-title sm:p-3 lg:p-4">
      <div className="mx-auto grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-4">
          {savedOverride && (
            <Card
              className="border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 shadow-sm sm:px-4 text-text-title"
              radius="xl"
              padding="none"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <Typography variant="bodyMedium" className="text-[13px] font-extrabold text-emerald-400">
                      Override saved · {savedOverride.employeeName} moved from {savedOverride.from} to {savedOverride.to}
                    </Typography>
                    <p className="mt-0.5 text-[12px] font-semibold text-emerald-500">
                      FY26 calibrated rating updated. 9-box position recalculated from manager rating and dependency.
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    bgColor="text"
                    className="h-8 rounded-md border-emerald-500/30 bg-card px-3 text-[12px] font-bold text-text-title hover:bg-slate-500/10"
                  >
                    Undo
                  </Button>
                  <Button
                    type="button"
                    variant="subtle"
                    bgColor="text"
                    className="h-8 rounded-md px-3 text-[12px] font-bold text-primary hover:bg-primary/20"
                    onClick={() => navigate("/webapp/performance-app/calibrator/session")}
                  >
                    View audit log →
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="border border-border bg-card px-3 py-3 shadow-sm sm:px-4" radius="xl" padding="none">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Typography variant="h3" className="text-[15px] font-bold text-text-title">
                  9-Box · India Tech · FY26
                </Typography>
                <Typography variant="bodyMedium" className="text-[13px] font-semibold text-text-body2">
                  12 of 142 employees · drag to reposition
                </Typography>
              </div>
              <div className="flex flex-wrap gap-2">
                {chips.map((chip, index) => (
                  <Badge
                    key={chip}
                    label={chip}
                    variant={index === 3 ? "success" : "info"}
                    size="sm"
                    icon={<X className="h-3 w-3" />}
                  />
                ))}
              </div>
            </div>
          </Card>

          <Card className="border border-border bg-card px-3 pb-5 pt-3 shadow-sm sm:px-4 sm:pt-4" radius="xl" padding="none">
            <div className="grid gap-3 md:grid-cols-[42px_minmax(0,1fr)]">
              <div className="flex items-center md:justify-center">
                <span className="whitespace-nowrap text-[12px] font-bold uppercase text-text-body2 md:-rotate-90">
                  Potential →
                </span>
              </div>
              <div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3">
                  {boxes.map((box) => {
                    const employees =
                      isVikramOverrideSaved && box.label === "INCONSISTENT"
                        ? box.employees.filter((employee) => employee.name !== "Vikram R.")
                        : isVikramOverrideSaved && box.label === "EFFECTIVE"
                          ? [{ initials: "VR", name: "Vikram R." }, ...box.employees]
                          : box.employees;
                    const count =
                      isVikramOverrideSaved && box.label === "INCONSISTENT"
                        ? 0
                        : isVikramOverrideSaved && box.label === "EFFECTIVE"
                          ? 1
                          : box.count;

                    return (
                    <div
                      key={box.label}
                      className={`min-h-[160px] rounded-xl border p-2.5 sm:min-h-[190px] sm:p-3 lg:min-h-[236px] ${box.color}`}
                    >
                      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
                        <Badge label={box.label} variant={box.badgeVariant} size="sm" />
                        <span className={`text-[15px] font-extrabold ${box.titleColor}`}>{count}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {employees.map((employee) => {
                          const isSavedEmployee =
                            isVikramOverrideSaved && box.label === "EFFECTIVE" && employee.name === "Vikram R.";

                          return (
                          <Button
                            key={`${box.label}-${employee.initials}-${employee.name}`}
                            type="button"
                            variant="outline"
                            bgColor="text"
                            className={`h-[54px] min-w-[78px] max-w-[112px] justify-start rounded-full bg-card px-2 text-left text-[10px] font-semibold text-text-title shadow-sm hover:bg-slate-500/10 cursor-pointer sm:h-[62px] sm:min-w-[86px] sm:max-w-[124px] sm:px-2.5 sm:text-[11px] ${
                              isSavedEmployee
                                ? "border-2 border-emerald-500 ring-2 ring-emerald-500/30"
                                : "border-border"
                            }`}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[8px] font-extrabold text-primary sm:h-6 sm:w-6 sm:text-[9px]">
                              {employee.initials}
                            </span>
                            <span className="truncate">{employee.name}</span>
                          </Button>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
                <div className="mt-3 hidden grid-cols-3 text-center text-[12px] font-bold uppercase text-text-body2 lg:grid">
                  <span>Low</span>
                  <span>Mid</span>
                  <span>High</span>
                </div>
                <div className="mt-3 text-left text-[11px] font-extrabold uppercase tracking-[0.12em] text-text-body2 lg:mt-1 lg:text-center">
                  Performance →
                </div>
              </div>
            </div>
          </Card>
        </div>

        <aside className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-1">
          <Card className="border border-border bg-card p-4 shadow-sm" radius="xl" padding="none">
            <Typography variant="h3" className="text-[19px] font-extrabold text-text-title">
              Promotion Filters
            </Typography>
            <Typography variant="bodyMedium" className="mt-1 text-[12px] font-semibold text-text-body2">
              Per Darwinbox handbook
            </Typography>
            <div className="mt-4 space-y-2">
              {filters.map((filter) => {
                const isEnabled = enabledFilters[filter.id];

                return (
                <div
                  key={filter.id}
                  className="flex min-h-[40px] items-center justify-between gap-3 rounded-md bg-slate-500/10 px-3 border border-border"
                >
                  <span className="min-w-0 text-[12px] font-semibold text-text-title">{filter.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-extrabold ${isEnabled ? "text-primary" : "text-text-body2"}`}>
                      {filter.value}
                    </span>
                    <button
                      type="button"
                      aria-pressed={isEnabled}
                      aria-label={`${isEnabled ? "Disable" : "Enable"} ${filter.label}`}
                      onClick={() => toggleFilter(filter.id)}
                      className={`relative h-5 w-9 shrink-0 rounded-md transition-colors cursor-pointer ${
                        isEnabled ? "bg-primary" : "bg-slate-500/30"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                          isEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
              <div className="text-3xl font-extrabold leading-none text-emerald-400">2</div>
              <div className="mt-1 text-[12px] font-semibold text-emerald-400">
                promotion candidates in current view
              </div>
            </div>
          </Card>

          <Card className="border border-border bg-card p-4 shadow-sm md:self-start xl:self-auto" radius="xl" padding="none">
            <Typography
              variant="caption"
              className="block text-[12px] font-extrabold uppercase text-text-body2"
            >
              Quick-pick — stars
            </Typography>
            <div className="mt-4 space-y-2.5">
              {quickPickEmployees.map((employee) => (
                <Button
                  key={`${employee.initials}-${employee.name}`}
                  type="button"
                  variant="outline"
                  bgColor="text"
                  fullWidth
                  contentAlign="between"
                  className="min-h-[54px] rounded-lg border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-left hover:bg-emerald-500/20 cursor-pointer"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-extrabold text-primary">
                      {employee.initials}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-extrabold leading-tight text-text-title">
                        {employee.name}
                      </div>
                      <div className="truncate text-[11px] font-semibold leading-tight text-text-body2">
                        {employee.role}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] font-extrabold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-md bg-emerald-500" />
                    {employee.rating}
                  </span>
                </Button>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </main>
  );
};

export default BoxGrid;
