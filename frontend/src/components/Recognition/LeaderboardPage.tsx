import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetRecognitionLeaderboard } from "../../services/recognitionService";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Trophy, Medal, Award, ArrowLeft } from "lucide-react";

const PERIODS = [
  { label: "All Time", value: undefined },
  { label: "Yearly", value: "yearly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Monthly", value: "monthly" },
] as const;

const LeaderboardPage: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"received" | "given">("received");
  const [period, setPeriod] = useState<string | undefined>(undefined);

  const { data, isLoading } = useGetRecognitionLeaderboard(period, activeTab);
  const entries = data?.leaderboard || [];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="size-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="size-6 text-gray-400" />;
    if (rank === 3) return <Award className="size-6 text-orange-400" />;
    return null;
  };

  const getRankBorder = (rank: number) => {
    if (rank === 1) return "border-2 border-yellow-400";
    if (rank === 2) return "border-2 border-gray-300";
    if (rank === 3) return "border-2 border-orange-300";
    return "border border-gray-200";
  };

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  const content = (
    <div className="bg-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/webapp/recognition")}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="size-5 text-gray-600" />
          </button>
          <div>
            <Typography variant="h1" className="text-2xl md:text-3xl font-bold">
              Leaderboard
            </Typography>
            <Typography variant="bodyMedium" color="body2">
              See who's leading in recognitions.
            </Typography>
          </div>
        </div>

        <Card radius="xl" className="border p-4 md:p-6">
          {/* Tabs */}
          <div className="flex gap-2 mb-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("received")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "received"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
            >
              Received
            </button>
            <button
              onClick={() => setActiveTab("given")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "given"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
            >
              Given
            </button>
          </div>

          {/* Period Filters */}
          <div className="flex flex-wrap gap-1 mb-6">
            {PERIODS.map((p) => (
              <button
                key={p.label}
                onClick={() => setPeriod(p.value)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${period === p.value
                    ? "bg-primary-50 text-header-active"
                    : "text-header-inactive hover:text-header-active"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : entries.length > 0 ? (
            <>
              {/* Top 3 */}
              {topThree.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {topThree.map((entry) => (
                    <div
                      key={entry.employee}
                      className={`flex flex-col items-center p-4 rounded-xl ${getRankBorder(entry.rank)} bg-gradient-to-br from-white to-gray-50`}
                    >
                      <div className="relative mb-2">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                          {entry.employee_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        {getRankIcon(entry.rank) && (
                          <div className="absolute -top-1 -right-1">
                            {getRankIcon(entry.rank)}
                          </div>
                        )}
                      </div>
                      <Typography variant="bodySmall" className="font-semibold text-center mb-0.5">
                        {entry.employee_name}
                      </Typography>
                      {entry.designation && (
                        <Typography variant="bodySmall" color="body2" className="text-center text-xs mb-1">
                          {entry.designation}
                        </Typography>
                      )}
                      <Typography variant="bodySmall" className="text-primary font-bold">
                        {entry.points} pts
                      </Typography>
                    </div>
                  ))}
                </div>
              )}

              {/* Rest */}
              <div className="space-y-2">
                {rest.map((entry) => (
                  <div
                    key={entry.employee}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
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
                      <div className="flex items-center gap-2">
                        {entry.designation && (
                          <Typography variant="bodySmall" color="body2">
                            {entry.designation}
                          </Typography>
                        )}
                        {entry.designation && entry.department && (
                          <span className="text-gray-300">|</span>
                        )}
                        {entry.department && (
                          <Typography variant="bodySmall" color="body2">
                            {entry.department}
                          </Typography>
                        )}
                      </div>
                    </div>
                    <Typography variant="bodyMedium" className="font-semibold text-primary">
                      {entry.points} pts
                    </Typography>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="size-12 mx-auto mb-4 text-gray-300" />
              <Typography variant="bodyMedium">No leaderboard data available</Typography>
              <Typography variant="bodySmall" color="body2" className="mt-1">
                Recognitions will populate the leaderboard.
              </Typography>
            </div>
          )}
        </Card>
      </div>
    </div>
  );

  if (!isDesktop) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <HeaderBar title="Leaderboard" />
        <main className="p-4 flex-grow overflow-y-auto">{content}</main>
      </div>
    );
  }

  return (
    <DesktopLayoutWrapper title="Leaderboard">
      <div className="p-4 md:p-6 overflow-y-auto h-full">{content}</div>
    </DesktopLayoutWrapper>
  );
};

export default LeaderboardPage;
