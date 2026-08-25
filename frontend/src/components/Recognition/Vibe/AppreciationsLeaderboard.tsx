/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { Search, Star } from "lucide-react";
import Avatar from "./Avatar";
import WrapperHoverCard from "../../shared/WrapperHoverCard";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import {
  useAppreciationLeaderboard,
  useAppreciationPrograms,
  LeaderboardPersonEntry,
  AppreciationApiItem,
} from "../../../services/recognitionService";
import formatToIndianDate from "../../../utils/formatToIndianDate";

// Resolve relative Frappe file paths (e.g. "/private/files/..") against the API host.
const API_HOST =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_DOMAIN ||
  (typeof window !== "undefined" ? window.location.origin : "");

const resolveImage = (image?: string | null): string | undefined => {
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `${API_HOST}${image}`;
  return image;
};

// Leaderboard rows read department; designation is the fallback for employees
// with no department set so the line never renders empty.
const subtitleOf = (p: LeaderboardPersonEntry): string =>
  p.department || p.designation || "";

const StarBadge: React.FC<{ rank: number }> = ({ rank }) => (
  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
    <div className="relative">
      <Star className="size-9 fill-amber-400 text-amber-400" />
      <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
        {rank}
      </span>
    </div>
  </div>
);

const PodiumColumn: React.FC<{
  person: LeaderboardPersonEntry;
  height: string;
  size: number;
  score: number;
  employeeId: string;
}> = ({ person, height, size, score, employeeId }) => (
  <div className={`flex flex-col items-center ${height}`}>
    <div className="relative mb-3">
      <StarBadge rank={person.rank} />
      <Avatar
        name={person.employee_name}
        photo={resolveImage(person.image)}
        size={size}
        className="ring-4 ring-white shadow-md"
      />
    </div>
    <Card radius="xl" className="border border-gray-100 shadow-sm px-4 py-4 w-full text-center bg-white">
      <WrapperHoverCard employeeId={employeeId}>
        <Typography variant="bodyMedium" className="font-semibold cursor-pointer">
          {person.employee_name}
        </Typography>
      </WrapperHoverCard>
      <Typography variant="bodySmall" color="body2" className="block truncate">
        {subtitleOf(person)}
      </Typography>
      {score > 0 && (
        <div className="flex items-center justify-center gap-1.5 mt-2 text-gray-700">
          <Star className="size-4 text-gray-400" />
          <span className="font-semibold">{score}</span>
        </div>
      )}
    </Card>
  </div>
);

// A single "My Appreciations" note card, powered by get_appreciation_programs.
const AppreciationNoteCard: React.FC<{ item: AppreciationApiItem }> = ({ item }) => (
  <Card radius="xl" className="border border-gray-100 p-4 bg-gray-50/60">
    <div className="flex items-center gap-3 mb-2">
      <Avatar name={item.person} photo={resolveImage(item.person_image)} size={36} />
      <div className="min-w-0">
        <WrapperHoverCard employeeId={item.person_id}>
          <Typography variant="bodyMedium" className="font-semibold truncate cursor-pointer">
            {item.person}
          </Typography>
        </WrapperHoverCard>
        <Typography variant="caption" color="body2" className="block">
          {item.direction === "received" ? "From" : "To"} · {formatToIndianDate(item.date)}
        </Typography>
      </div>
    </div>
    {item.message && (
      <Typography variant="bodySmall" className="mb-3 block">
        {item.message}
      </Typography>
    )}
    {item.values.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {item.values.map((v) => (
          <span
            key={v}
            className="inline-block rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600"
          >
            {v}
          </span>
        ))}
      </div>
    )}
  </Card>
);

const SIDEBAR_VISIBLE = 3;

const AppreciationsLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"Receivers" | "Recognizers">("Receivers");
  const [appreciationTab, setAppreciationTab] = useState<"Received" | "Given">("Received");
  const [query, setQuery] = useState("");

  // ── Left: leaderboard (Receivers / Recognizers) ──────────────────────────────
  const { data: lbResp, isLoading: lbLoading } = useAppreciationLeaderboard({
    tab: activeTab === "Receivers" ? "receivers" : "recognizers",
    page_length: 100,
  });
  const entries = lbResp?.data ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  // Score shown next to each person follows the leaderboard ranking basis
  // (Advanced Settings → leaderboard_ranking_based_on_points): points vs count.
  const rankingBasis = lbResp?.ranking_basis ?? "count";
  const scoreOf = (p: LeaderboardPersonEntry) =>
    rankingBasis === "points" ? p.points : p.count;

  // Search filters the list below the podium, preserving the true ranks.
  const q = query.trim().toLowerCase();
  const filteredRest = q
    ? rest.filter(
        (p) =>
          p.employee_name.toLowerCase().includes(q) ||
          subtitleOf(p).toLowerCase().includes(q),
      )
    : rest;

  // Podium staircase: rank 2 (left), rank 1 (center, tallest), rank 3 (right).
  const podiumOrder = useMemo(
    () =>
      [
        { person: top3[1], height: "mt-10", size: 80 },
        { person: top3[0], height: "mt-0", size: 96 },
        { person: top3[2], height: "mt-16", size: 80 },
      ].filter((c) => c.person),
    [top3],
  );

  // ── Right: My Appreciations (received / given) ───────────────────────────────
  const { data: currentUser } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { targetEmployeeId } = useTargetUser();
  const employeeId = targetEmployeeId || currentUser?.employee || "";
  const { data: receivedResp, isLoading: receivedLoading } = useAppreciationPrograms({
    employee: employeeId,
    direction: "received",
    page_length: 20,
  });
  const { data: givenResp, isLoading: givenLoading } = useAppreciationPrograms({
    employee: employeeId,
    direction: "given",
    page_length: 20,
  });
  const receivedItems = receivedResp?.data ?? [];
  const givenItems = givenResp?.data ?? [];
  const receivedCount = receivedResp?.total_count ?? receivedItems.length;
  const givenCount = givenResp?.total_count ?? givenItems.length;
  const activeItems = appreciationTab === "Received" ? receivedItems : givenItems;
  const visibleItems = activeItems.slice(0, SIDEBAR_VISIBLE);
  const hiddenItems = activeItems.length - visibleItems.length;
  const sidebarLoading = appreciationTab === "Received" ? receivedLoading : givenLoading;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <span className="font-semibold text-gray-900">Leaderboard</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left – Podium + List */}
        <div className="lg:col-span-2">
          <Card radius="xl" className="border border-gray-100 shadow-sm p-5">
            {/* Tabs + Search */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-6 border-b border-gray-100">
                {(["Receivers", "Recognizers"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-44 sm:w-56">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search people..."
                    className="w-full rounded-lg border border-gray-200 py-1.5 pl-9 pr-3 text-xs text-gray-700 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            {lbLoading ? (
              <div className="py-16 text-center text-sm text-gray-400">Loading leaderboard…</div>
            ) : entries.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                No {activeTab.toLowerCase()} yet.
              </div>
            ) : (
              <>
                {/* Podium */}
                {podiumOrder.length > 0 && (
                  <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50/40 to-transparent px-2 pt-12 pb-6">
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center">
                      <div className="flex h-[260px] w-[520px] max-w-full items-end justify-center rounded-t-full bg-blue-100/50">
                        <div className="flex h-[220px] w-[440px] items-end justify-center rounded-t-full bg-blue-100/60">
                          <div className="h-[180px] w-[360px] rounded-t-full bg-blue-200/40" />
                        </div>
                      </div>
                    </div>
                    <div className="relative grid grid-cols-3 gap-3 items-start">
                      {podiumOrder.map((col) => (
                        <PodiumColumn
                          key={col.person!.employee}
                          person={col.person!}
                          height={col.height}
                          size={col.size}
                          score={scoreOf(col.person!)}
                          employeeId={col.person!.employee}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Rest of list (rank 4+) */}
                <div className="space-y-3">
                  {filteredRest.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">
                      {q ? "No people found." : "No more entries."}
                    </p>
                  ) : (
                    filteredRest.map((person) => (
                      <div
                        key={person.employee}
                        className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex size-7 items-center justify-center rounded-full bg-purple-50 text-xs font-semibold text-purple-600 shrink-0">
                          {person.rank}
                        </div>
                        <Avatar
                          name={person.employee_name}
                          photo={resolveImage(person.image)}
                          size={40}
                        />
                        <div className="min-w-0 flex-1">
                          <WrapperHoverCard employeeId={person.employee}>
                            <Typography variant="bodyMedium" className="font-semibold cursor-pointer">
                              {person.employee_name}
                            </Typography>
                          </WrapperHoverCard>
                          <Typography variant="bodySmall" color="body2" className="block truncate">
                            {subtitleOf(person)}
                          </Typography>
                        </div>
                        {scoreOf(person) > 0 && (
                          <div className="flex items-center gap-1.5 text-gray-700 shrink-0">
                            <Star className="size-4 text-gray-400" />
                            <span className="font-semibold">{scoreOf(person)}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Right – My Appreciations */}
        <div>
          <Card radius="xl" className="border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h4" className="font-bold">
                My Appreciations
              </Typography>
              <button
                onClick={() => navigate("/webapp/recognition/vibe/history")}
                className="text-sm font-medium text-primary"
              >
                View All
              </button>
            </div>

            <div className="flex items-center gap-6 border-b border-gray-100 mb-5">
              {(["Received", "Given"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAppreciationTab(tab)}
                  className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                    appreciationTab === tab
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

            {sidebarLoading ? (
              <div className="space-y-4">
                {[0, 1].map((i) => (
                  <Card
                    key={i}
                    radius="xl"
                    className="h-24 animate-pulse border border-gray-100 bg-gray-50/60"
                  >
                    <span className="sr-only">Loading…</span>
                  </Card>
                ))}
              </div>
            ) : activeItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No {appreciationTab.toLowerCase()} appreciations yet.
              </p>
            ) : (
              <div className="space-y-4">
                {visibleItems.map((item) => (
                  <AppreciationNoteCard key={item.name} item={item} />
                ))}
                {hiddenItems > 0 && (
                  <button
                    onClick={() => navigate("/webapp/recognition/vibe/history")}
                    className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-primary hover:bg-gray-50"
                  >
                    View all {activeItems.length} {appreciationTab.toLowerCase()}
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

export default AppreciationsLeaderboard;
