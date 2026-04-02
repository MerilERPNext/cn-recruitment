import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import { ProgramWinner } from "../../types/recognition";
import { ArrowRight, Trophy } from "lucide-react";

interface LastProgramWinnersProps {
  winners: ProgramWinner[];
  isLoading?: boolean;
}

export const LastProgramWinners: React.FC<LastProgramWinnersProps> = ({
  winners,
  isLoading,
}) => {
  const navigate = useNavigate();
  if (isLoading) {
    return (
      <Card radius="xl" className="border p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card radius="xl" className="border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="subheading" className="font-semibold">
          Last Program Winners
        </Typography>
        <button onClick={() => navigate("/webapp/recognition/hall-of-fame")} className="text-primary hover:text-primary-dark flex items-center gap-1 text-sm font-medium transition-colors">
          View Hall of Fame
          <ArrowRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {winners.length > 0 ? (
          winners.map((winner) => (
            <div
              key={winner.id}
              className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4 pt-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center text-center w-full overflow-hidden">
                {/* Avatar */}
                <div className="relative mb-2">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                    {winner.employee_name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center shadow-sm">
                    <Trophy className="size-3.5 text-yellow-900" />
                  </div>
                </div>

                {/* Winner ribbon */}
                <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded mb-1.5 uppercase tracking-wide">
                  Winner
                </span>

                {/* Name */}
                <Typography variant="bodyMedium" className="font-semibold mb-0.5 truncate w-full">
                  {winner.employee_name}
                </Typography>

                {/* Designation */}
                {winner.designation && (
                  <Typography variant="bodySmall" color="body2" className="mb-2 truncate w-full">
                    {winner.designation}
                  </Typography>
                )}

                {/* Badge */}
                {winner.badge_name && (
                  <div
                    className="px-3 py-1 rounded-md text-xs font-medium text-white inline-block max-w-full truncate"
                    style={{
                      backgroundColor: winner.color || "#6366f1",
                    }}
                  >
                    {winner.badge_name}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-8 text-gray-500">
            <Typography variant="bodyMedium">No winners yet</Typography>
          </div>
        )}
      </div>
    </Card>
  );
};
