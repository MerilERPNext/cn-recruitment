import React, { useState } from "react";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import { ChevronDown, SlidersHorizontal, Star } from "lucide-react";
import Avatar from "./Avatar";
import {
  LEADERBOARD_TOP3,
  LEADERBOARD_REST,
  MY_APPRECIATION_BADGES,
  MY_APPRECIATION_NOTE,
  LeaderboardPerson,
} from "./vibeMockData";

// Classic podium staircase: rank 1 (center) sits highest, rank 2 (left) a step
// lower, rank 3 (right) lowest — matching the uploaded leaderboard layout.
const PODIUM_ORDER = [
  { person: LEADERBOARD_TOP3.find((p) => p.rank === 2)!, height: "mt-10", size: 80 },
  { person: LEADERBOARD_TOP3.find((p) => p.rank === 1)!, height: "mt-0", size: 96 },
  { person: LEADERBOARD_TOP3.find((p) => p.rank === 3)!, height: "mt-16", size: 80 },
];

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

const PodiumColumn: React.FC<{ person: LeaderboardPerson; height: string; size: number }> = ({
  person,
  height,
  size,
}) => (
  <div className={`flex flex-col items-center ${height}`}>
    <div className="relative mb-3">
      <StarBadge rank={person.rank} />
      <Avatar name={person.name} size={size} className="ring-4 ring-white shadow-md" />
    </div>
    <Card radius="xl" className="border border-gray-100 shadow-sm px-4 py-4 w-full text-center bg-white">
      <Typography variant="bodyMedium" className="font-semibold">
        {person.name}
      </Typography>
      <Typography variant="bodySmall" color="body2" className="block truncate">
        {person.designation}
      </Typography>
      <div className="flex items-center justify-center gap-1.5 mt-2 text-gray-700">
        <Star className="size-4 text-gray-400" />
        <span className="font-semibold">{person.medals}</span>
      </div>
    </Card>
  </div>
);

const AppreciationsLeaderboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"Receivers" | "Recognizers">("Receivers");
  const [appreciationTab, setAppreciationTab] = useState<"Received" | "Given">("Received");

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        <span>Vibe</span>
        <span>/</span>
        <span className="font-semibold text-gray-900">Leaderboard</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left – Podium + List */}
        <div className="lg:col-span-2">
          <Card radius="xl" className="border border-gray-100 shadow-sm p-5">
            {/* Tabs + Filter */}
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
                <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600">
                  Last 365 Days
                  <ChevronDown className="size-4" />
                </button>
                <button className="rounded-lg border border-gray-200 p-2 text-gray-500">
                  <SlidersHorizontal className="size-4" />
                </button>
              </div>
            </div>

            {/* Podium */}
            <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50/40 to-transparent px-2 pt-12 pb-6">
              {/* Decorative concentric arc background behind the winners */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center">
                <div className="flex h-[260px] w-[520px] max-w-full items-end justify-center rounded-t-full bg-blue-100/50">
                  <div className="flex h-[220px] w-[440px] items-end justify-center rounded-t-full bg-blue-100/60">
                    <div className="h-[180px] w-[360px] rounded-t-full bg-blue-200/40" />
                  </div>
                </div>
              </div>
              <div className="relative grid grid-cols-3 gap-3 items-start">
                {PODIUM_ORDER.map((col) => (
                  <PodiumColumn key={col.person.rank} {...col} />
                ))}
              </div>
            </div>

            {/* Rest of list */}
            <div className="space-y-3">
              {LEADERBOARD_REST.map((person) => (
                <div
                  key={person.rank}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex size-7 items-center justify-center rounded-full bg-purple-50 text-xs font-semibold text-purple-600 shrink-0">
                    {person.rank}
                  </div>
                  <Avatar name={person.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <Typography variant="bodyMedium" className="font-semibold">
                      {person.name}
                    </Typography>
                    <Typography variant="bodySmall" color="body2" className="block truncate">
                      {person.designation}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700 shrink-0">
                    <Star className="size-4 text-gray-400" />
                    <span className="font-semibold">{person.medals}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right – My Appreciations */}
        <div>
          <Card radius="xl" className="border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h4" className="font-bold">
                My Appreciations
              </Typography>
              <button className="text-sm font-medium text-primary">View All</button>
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
                    4
                  </span>
                </button>
              ))}
            </div>

            {/* Badges */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {MY_APPRECIATION_BADGES.map((badge, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="relative">
                    <div
                      className={`flex size-12 items-center justify-center rounded-xl ${badge.color} text-white shadow-sm`}
                    >
                      <Star className="size-6 fill-white" />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700 border border-white">
                      {badge.count}
                    </span>
                  </div>
                  <Typography variant="caption" className="mt-1.5 text-[11px] leading-tight">
                    {badge.label}
                  </Typography>
                </div>
              ))}
            </div>

            {/* Note */}
            <Card radius="xl" className="border border-gray-100 p-4 bg-gray-50/60">
              <div className="flex items-center gap-3 mb-2">
                <Avatar name={MY_APPRECIATION_NOTE.name} size={36} />
                <div>
                  <Typography variant="bodyMedium" className="font-semibold">
                    {MY_APPRECIATION_NOTE.name}
                  </Typography>
                  <Typography variant="caption" color="body2" className="block">
                    {MY_APPRECIATION_NOTE.date}
                  </Typography>
                </div>
              </div>
              <Typography variant="bodySmall" className="mb-3">
                {MY_APPRECIATION_NOTE.message}
              </Typography>
              <span className="inline-block rounded-lg bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600">
                {MY_APPRECIATION_NOTE.tag}
              </span>
            </Card>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppreciationsLeaderboard;
