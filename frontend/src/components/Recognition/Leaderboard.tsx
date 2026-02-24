import React, { useState } from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { LeaderboardEntry } from "../../types/recognition";
import { Trophy, Medal, Award, ArrowRight } from "lucide-react";

interface LeaderboardProps {
  received: LeaderboardEntry[];
  given: LeaderboardEntry[];
  isLoading?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  received,
  given,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<"received" | "given">("received");
  const data = activeTab === "received" ? received : given;

  if (isLoading) {
    return (
      <Card radius="xl" className="border p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return <Trophy className="size-6 text-yellow-500" />;
    } else if (rank === 2) {
      return <Medal className="size-6 text-gray-400" />;
    } else if (rank === 3) {
      return <Award className="size-6 text-orange-400" />;
    }
    return null;
  };

  const getRankBorder = (rank: number) => {
    if (rank === 1) {
      return "border-2 border-yellow-400";
    } else if (rank === 2) {
      return "border-2 border-gray-300";
    } else if (rank === 3) {
      return "border-2 border-orange-300";
    }
    return "border border-gray-200";
  };

  const topThree = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <Card radius="xl" className="border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="subheading" className="font-semibold">
          Leaderboard
        </Typography>
        <button className="text-primary hover:text-primary-dark flex items-center gap-1 text-sm font-medium transition-colors">
          View All
          <ArrowRight className="size-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("received")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "received"
              ? "border-primary text-primary"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Received
        </button>
        <button
          onClick={() => setActiveTab("given")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "given"
              ? "border-primary text-primary"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Given
        </button>
      </div>

      {/* Top 3 */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          {topThree.map((entry) => (
            <div
              key={entry.employee}
              className={`flex flex-col items-center p-3 rounded-xl ${getRankBorder(
                entry.rank
              )} bg-gradient-to-br from-white to-gray-50`}
            >
              <div className="relative mb-2">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {entry.employee_name?.charAt(0).toUpperCase() || "?"}
                </div>
                {getRankIcon(entry.rank) && (
                  <div className="absolute -top-1 -right-1">
                    {getRankIcon(entry.rank)}
                  </div>
                )}
              </div>
              <Typography variant="bodySmall" className="font-semibold text-center mb-1">
                {entry.employee_name}
              </Typography>
              <Typography variant="bodySmall" className="text-primary font-bold">
                {entry.points} pts
              </Typography>
            </div>
          ))}
        </div>
      )}

      {/* Rest of the list */}
      <div className="space-y-2">
        {rest.map((entry) => (
          <div
            key={entry.employee}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
              {entry.rank}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {entry.employee_name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <Typography variant="bodyMedium" className="font-medium">
                {entry.employee_name}
              </Typography>
              {entry.designation && (
                <Typography variant="bodySmall" color="body2">
                  {entry.designation}
                </Typography>
              )}
            </div>
            <Typography variant="bodyMedium" className="font-semibold text-primary">
              {entry.points} pts
            </Typography>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Typography variant="bodyMedium">No data available</Typography>
        </div>
      )}
    </Card>
  );
};
