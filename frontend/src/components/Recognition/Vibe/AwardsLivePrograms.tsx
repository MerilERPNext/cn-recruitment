import React, { useEffect, useRef, useState } from "react";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { Check, ChevronDown, Search, Trophy } from "lucide-react";
import Avatar from "./Avatar";
import { AWARD_PROGRAMS, MY_AWARDS, AwardProgram } from "./vibeMockData";

const WinnersRibbon: React.FC = () => (
  <div className="absolute left-0 top-3 z-10">
    <div className="relative bg-amber-400 px-3 py-1 text-xs font-semibold text-white shadow-sm">
      Winners
      <span className="absolute -right-2 top-0 h-full w-2 bg-amber-400 [clip-path:polygon(0_0,100%_50%,0_100%)]" />
    </div>
  </div>
);

const TrophyArt: React.FC = () => (
  <div className="flex h-full min-h-[120px] items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-orange-50">
    <Trophy className="size-12 text-amber-400" />
  </div>
);

const ProgramCard: React.FC<{ program: AwardProgram }> = ({ program }) => (
  <Card radius="xl" className="relative border border-gray-100 shadow-sm overflow-hidden">
    <WinnersRibbon />
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 p-5">
      <TrophyArt />
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <Typography variant="h4" className="font-bold">
            {program.title}
          </Typography>
          <button className="text-sm font-medium text-primary shrink-0">View All</button>
        </div>
        <span className="inline-block rounded-xl bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
          Closed on {program.closedOn}
        </span>

        {program.winners.length > 0 && (
          <div className="mt-5 flex flex-wrap items-start gap-4 sm:gap-5">
            {program.winners.map((w) => (
              <div key={w.name} className="flex flex-col items-center text-center w-20 sm:w-24">
                <Avatar name={w.name} initials={w.initials} size={56} />
                <Typography variant="bodySmall" className="mt-2 font-semibold leading-tight">
                  {w.name}
                </Typography>
                <Typography variant="caption" color="body2" className="leading-tight">
                  {w.designation}
                </Typography>
              </div>
            ))}
            {program.moreMembers > 0 && (
              <div className="flex flex-col items-center text-center w-20 sm:w-24">
                <div className="flex size-14 items-center justify-center rounded-full bg-gray-400 text-white font-semibold">
                  +{program.moreMembers}
                </div>
                <Typography variant="caption" color="body2" className="mt-2">
                  Members
                </Typography>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </Card>
);

// Inline labelled single-select dropdown (Filters / Sort) used in the toolbar.
const TIME_OPTIONS = [{ label: "All Time", value: "all-time" }];
const SORT_OPTIONS = [
  { label: "Relevance", value: "relevance" },
  { label: "Nomination Date (Newest)", value: "nomination-newest" },
  { label: "Nomination Date (Oldest)", value: "nomination-oldest" },
];

const LabeledSelect: React.FC<{
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex min-w-[120px] items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 transition ${
            open ? "border-primary" : "border-gray-200"
          }`}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown
            className={`size-4 shrink-0 text-gray-500 transition ${open ? "rotate-180" : ""}`}
          />
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-1 min-w-[170px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                  value === o.value ? "font-semibold text-gray-900" : "text-gray-700"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {value === o.value && <Check className="size-4 shrink-0 text-blue-500" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// closedOn is "DD-MM-YYYY".
const parseClosedOn = (s: string): number => {
  const [d, m, y] = (s || "").split("-").map(Number);
  return new Date(y || 0, (m || 1) - 1, d || 1).getTime();
};

const AwardsLivePrograms: React.FC = () => {
  const [awardTab, setAwardTab] = useState<"Received" | "Given">("Received");
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all-time");
  const [sortBy, setSortBy] = useState("relevance");

  const q = query.trim().toLowerCase();
  const filteredPrograms = q
    ? AWARD_PROGRAMS.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.winners || []).some((w) => w.name.toLowerCase().includes(q)),
      )
    : AWARD_PROGRAMS;

  const displayedPrograms = [...filteredPrograms];
  if (sortBy === "nomination-newest") {
    displayedPrograms.sort((a, b) => parseClosedOn(b.closedOn) - parseClosedOn(a.closedOn));
  } else if (sortBy === "nomination-oldest") {
    displayedPrograms.sort((a, b) => parseClosedOn(a.closedOn) - parseClosedOn(b.closedOn));
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>Vibe</span>
          <span>/</span>
          <span className="font-semibold text-gray-900">All Awards</span>
        </div>
        <button className="text-sm font-medium text-blue-600">View Eligibility</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left – Programs */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search awards..."
                className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-4">
              <LabeledSelect
                label="Filters"
                value={timeFilter}
                options={TIME_OPTIONS}
                onChange={setTimeFilter}
              />
              <LabeledSelect
                label="Sort"
                value={sortBy}
                options={SORT_OPTIONS}
                onChange={setSortBy}
              />
            </div>
          </div>
          {displayedPrograms.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No awards found.</p>
          ) : (
            displayedPrograms.map((p) => <ProgramCard key={p.title} program={p} />)
          )}
        </div>

        {/* Right – My Awards */}
        <div>
          <Card radius="xl" className="border border-gray-100 shadow-sm p-5">
            <div className="mb-4 flex items-center justify-between">
              <Typography variant="h4" className="font-bold">
                My Awards
              </Typography>
              <button className="text-sm font-medium text-primary">View All</button>
            </div>

            <div className="mb-6 flex items-center gap-6 border-b border-gray-100">
              {(["Received", "Given"] as const).map((tab, i) => (
                <button
                  key={tab}
                  onClick={() => setAwardTab(tab)}
                  className={`flex items-center gap-1.5 pb-2 -mb-px text-sm font-medium transition-colors border-b-2 ${
                    awardTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {tab}
                  <span className="flex size-5 items-center justify-center rounded-full bg-purple-100 text-[10px] font-semibold text-purple-600">
                    {i === 0 ? 9 : 1}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-5">
              {MY_AWARDS.map((award) => (
                <Card
                  key={award.title}
                  radius="xl"
                  className="border border-amber-200 p-4 pt-7 relative"
                >
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <div className="flex size-10 items-center justify-center rounded-full border-2 border-amber-300 bg-white">
                      <Trophy className="size-5 text-amber-400" />
                    </div>
                  </div>
                  <Typography variant="bodyMedium" className="font-bold text-center">
                    {award.title}
                  </Typography>
                  <div className="mt-1 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <span>{award.org}</span>
                    <span>{award.date}</span>
                  </div>
                  <Typography variant="bodySmall" color="body2" className="mt-3 block">
                    {award.message}
                  </Typography>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {award.values.map((v) => (
                      <span
                        key={v}
                        className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AwardsLivePrograms;
