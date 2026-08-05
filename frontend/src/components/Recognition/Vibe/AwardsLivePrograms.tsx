/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { Check, ChevronDown, Search, Trophy } from "lucide-react";
import Avatar from "./Avatar";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import {
  useAwardEmployeePoints,
  useAwardPrograms,
  useRecognitionFlags,
  AwardPointsAward,
  AwardProgramItem,
} from "../../../services/recognitionService";

// Resolve relative Frappe file paths (e.g. "/private/files/..") against the API host.
const API_HOST =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_DOMAIN ||
  (typeof window !== "undefined" ? window.location.origin : "");

const resolvePhoto = (image?: string | null): string | undefined => {
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `${API_HOST}${image}`;
  return image;
};

// "YYYY-MM-DD" -> "DD-MM-YYYY"
const formatDate = (iso?: string | null): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.split(" ")[0].split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
};

const initialsOf = (name?: string | null): string =>
  (name || "")
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

// View model derived from the API award row.
interface ProgramVM {
  award: string;
  title: string;
  totalPoints: number;
  /** Program end date; drives the "Closed on <date>" chip when present. */
  closedOn: string | null;
  lastDate: string | null;
  /** Lower-cased names of every employee in this award, for client-side search. */
  searchNames: string;
  winners: {
    employee: string;
    name: string;
    designation: string;
    photo?: string;
    initials: string;
    points: number;
  }[];
  moreMembers: number;
}

const MAX_VISIBLE_WINNERS = 3;

const toProgramVM = (a: AwardPointsAward): ProgramVM => {
  const employees = a.employees || [];
  const visible = employees.slice(0, MAX_VISIBLE_WINNERS);
  const lastDate = employees.reduce<string | null>((acc, e) => {
    if (!e.last_nomination_date) return acc;
    return !acc || e.last_nomination_date > acc ? e.last_nomination_date : acc;
  }, null);
  return {
    award: a.award,
    title: a.award_name || a.award,
    totalPoints: a.total_points || 0,
    closedOn: a.end_date || null,
    lastDate,
    searchNames: employees
      .map((e) => (e.full_name || e.employee_name || "").toLowerCase())
      .join(" "),
    winners: visible.map((e) => ({
      employee: e.employee,
      name: e.full_name || e.employee_name || e.employee,
      designation: e.designation || "",
      photo: resolvePhoto(e.image),
      initials: initialsOf(e.full_name || e.employee_name),
      points: e.total_points || 0,
    })),
    moreMembers: Math.max(0, employees.length - visible.length),
  };
};

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

const ProgramCard: React.FC<{ program: ProgramVM; showWinners: boolean }> = ({
  program,
  showWinners,
}) => (
  <Card radius="xl" className="relative border border-gray-100 shadow-sm overflow-hidden">
    {showWinners && <WinnersRibbon />}
    <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 p-5">
      <TrophyArt />
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <Typography variant="h4" className="font-bold">
            {program.title}
          </Typography>
          <button className="text-sm font-medium text-primary shrink-0">View All</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-block rounded-xl bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
            {program.closedOn
              ? `Closed on ${formatDate(program.closedOn)}`
              : `Last nomination ${formatDate(program.lastDate)}`}
          </span>
        </div>

        {showWinners && program.winners.length > 0 && (
          <div className="mt-5 flex flex-wrap items-start gap-4 sm:gap-5">
            {program.winners.map((w) => (
              <div key={w.employee} className="flex flex-col items-center text-center w-20 sm:w-24">
                <Avatar name={w.name} initials={w.initials} photo={w.photo} size={56} />
                <WrapperHoverCard employeeId={w.employee}>
                  <Typography variant="bodySmall" className="mt-2 font-bold leading-tight cursor-pointer">
                    {w.name}
                  </Typography>
                </WrapperHoverCard>
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
// Values map directly to the get_award_employee_points API params.
const TIME_OPTIONS = [
  { label: "All Time", value: "all" },
  { label: "This Month", value: "month" },
  { label: "This Quarter", value: "quarter" },
  { label: "This Year", value: "year" },
];
const SORT_OPTIONS = [
  { label: "Nomination Date (Newest)", value: "nomination_date desc" },
  { label: "Nomination Date (Oldest)", value: "nomination_date asc" },
  { label: "Points (High to Low)", value: "points desc" },
  { label: "Points (Low to High)", value: "points asc" },
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

// A single "My Awards" card (received or given), powered by get_award_programs.
const MyAwardCard: React.FC<{ award: AwardProgramItem }> = ({ award }) => (
  <Card radius="xl" className="border border-amber-200 p-4 pt-7 relative">
    <div className="absolute -top-5 left-1/2 -translate-x-1/2">
      <div className="flex size-10 items-center justify-center rounded-full border-2 border-amber-300 bg-white">
        <Trophy className="size-5 text-amber-400" />
      </div>
    </div>
    <Typography variant="bodyMedium" className="font-bold text-center">
      {award.title}
    </Typography>
    <div className="mt-1 flex items-center justify-center gap-2 text-xs text-gray-500">
      {award.org && <span>{award.org}</span>}
      <span>{award.date}</span>
    </div>
    {award.person && (
      <div className="mt-1 text-center text-xs text-gray-400">
        {award.direction === "received" ? "From" : "To"}{" "}
        <WrapperHoverCard employeeId={award.person_id}>
          <span className="font-medium text-gray-600 cursor-pointer">{award.person}</span>
        </WrapperHoverCard>
      </div>
    )}
    {award.message && (
      <Typography variant="bodySmall" color="body2" className="mt-3 block">
        {award.message}
      </Typography>
    )}
    {award.values.length > 0 && (
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
    )}
  </Card>
);

const MY_AWARDS_SIDEBAR_LIMIT = 50;
// Only the first few cards are shown in the panel; the rest live behind "View All".
const MY_AWARDS_VISIBLE = 3;

const AwardsLivePrograms: React.FC = () => {
  const navigate = useNavigate();
  const [awardTab, setAwardTab] = useState<"Received" | "Given">("Received");
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("nomination_date desc");

  // My Awards (right panel) — received + given from get_award_programs.
  const { data: currentUser } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const employeeId = targetEmployeeId || currentUser?.employee || "";
  // `direction` is sent in the payload so the server returns only that tab's
  // awards. One query per direction keeps both tab counts accurate.
  const { data: receivedResp, isLoading: receivedLoading } = useAwardPrograms({
    employee: employeeId,
    direction: "received",
    page_length: MY_AWARDS_SIDEBAR_LIMIT,
  });
  const { data: givenResp, isLoading: givenLoading } = useAwardPrograms({
    employee: employeeId,
    direction: "given",
    page_length: MY_AWARDS_SIDEBAR_LIMIT,
  });
  const receivedAwards = receivedResp?.data ?? [];
  const givenAwards = givenResp?.data ?? [];
  const receivedCount = receivedResp?.total_count ?? receivedAwards.length;
  const givenCount = givenResp?.total_count ?? givenAwards.length;
  const activeAwards = awardTab === "Received" ? receivedAwards : givenAwards;
  const visibleAwards = activeAwards.slice(0, MY_AWARDS_VISIBLE);
  const hiddenCount = activeAwards.length - visibleAwards.length;
  const myAwardsLoading = awardTab === "Received" ? receivedLoading : givenLoading;

  // Award winners are shown only when enabled in the Advanced Settings doctype.
  const { displayIndividualAwardWinners, displayTeamAwardWinners } =
    useRecognitionFlags();
  const showWinners = displayIndividualAwardWinners || displayTeamAwardWinners;

  // Filters + Sort drive the server-side request; search filters client-side.
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAwardEmployeePoints({ time_period: timeFilter, sort: sortBy });

  const programs = useMemo<ProgramVM[]>(
    () => (data?.awards || []).map(toProgramVM),
    [data],
  );

  const q = query.trim().toLowerCase();
  const displayedPrograms = q
    ? programs.filter(
        (p) => p.title.toLowerCase().includes(q) || p.searchNames.includes(q),
      )
    : programs;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <span>Recognition</span>
          <span>/</span>
          <span className="font-semibold text-gray-900">All Awards</span>
        </div>
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
          {isLoading ? (
            <div className="space-y-5">
              {[0, 1].map((i) => (
                <Card
                  key={i}
                  radius="xl"
                  className="h-40 animate-pulse border border-gray-100 bg-gray-50 shadow-sm"
                >
                  <span className="sr-only">Loading awards…</span>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-red-500">
                {(error as Error)?.message || "Failed to load awards."}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-3 rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Retry
              </button>
            </div>
          ) : displayedPrograms.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No awards found.</p>
          ) : (
            <>
              {isFetching && (
                <p className="text-xs text-gray-400">Updating…</p>
              )}
              {displayedPrograms.map((p) => (
                <ProgramCard key={p.award} program={p} showWinners={showWinners} />
              ))}
            </>
          )}
        </div>

        {/* Right – My Awards */}
        <div>
          <Card radius="xl" className="border border-gray-100 shadow-sm p-5">
            <div className="mb-4 flex items-center justify-between">
              <Typography variant="h4" className="font-bold">
                My Awards
              </Typography>
              <button
                onClick={() => navigate("/webapp/recognition/vibe/awards-history")}
                className="text-sm font-medium text-primary"
              >
                View All
              </button>
            </div>

            <div className="mb-6 flex items-center gap-6 border-b border-gray-100">
              {(["Received", "Given"] as const).map((tab) => (
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
                    {tab === "Received" ? receivedCount : givenCount}
                  </span>
                </button>
              ))}
            </div>

            {myAwardsLoading ? (
              <div className="space-y-5">
                {[0, 1].map((i) => (
                  <Card
                    key={i}
                    radius="xl"
                    className="h-28 animate-pulse border border-amber-100 bg-amber-50/40"
                  >
                    <span className="sr-only">Loading awards…</span>
                  </Card>
                ))}
              </div>
            ) : visibleAwards.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No {awardTab.toLowerCase()} awards yet.
              </p>
            ) : (
              <div className="space-y-5">
                {visibleAwards.map((award) => (
                  <MyAwardCard key={award.name} award={award} />
                ))}
                {hiddenCount > 0 && (
                  <button
                    onClick={() => navigate("/webapp/recognition/vibe/awards-history")}
                    className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-primary hover:bg-gray-50"
                  >
                    View all {activeAwards.length} {awardTab.toLowerCase()} awards
                  </button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AwardsLivePrograms;
