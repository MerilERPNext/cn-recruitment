import React from "react";
import { useNavigate } from "react-router-dom";
import { useGetLastProgramWinners } from "../../services/recognitionService";
import { Typography } from "../shared/atoms/Typography";
import { Card } from "../shared/atoms/Card";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Trophy, ArrowLeft } from "lucide-react";

const HallOfFamePage: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const { data, isLoading } = useGetLastProgramWinners(50);

  const winners = data?.winners || [];

  const content = (
    <div className="bg-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
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
              Hall of Fame
            </Typography>
            <Typography variant="bodyMedium" color="body2">
              Celebrating our top performers and award winners.
            </Typography>
          </div>
        </div>

        {/* Winners Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : winners.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {winners.map((winner, index) => (
              <Card
                key={winner.id}
                radius="xl"
                className="border bg-gradient-to-br from-white to-gray-50 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col items-center text-center w-full overflow-hidden">
                  {/* Avatar */}
                  <div className="relative mb-3">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                      {winner.employee_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1">
                        <Trophy className="size-5 text-yellow-500" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <Typography variant="bodyMedium" className="font-semibold mb-1 truncate w-full">
                    {winner.employee_name}
                  </Typography>

                  {/* Designation */}
                  {winner.designation && (
                    <Typography variant="bodySmall" color="body2" className="mb-1 truncate w-full">
                      {winner.designation}
                    </Typography>
                  )}

                  {/* Department */}
                  {winner.department && (
                    <Typography variant="bodySmall" color="body2" className="mb-2 truncate w-full">
                      {winner.department}
                    </Typography>
                  )}

                  {/* Badge */}
                  {winner.badge_name && (
                    <div
                      className="px-3 py-1 rounded-lg text-xs font-medium text-white inline-block max-w-full truncate mb-2"
                      style={{ backgroundColor: winner.color || "#6366f1" }}
                    >
                      {winner.badge_name}
                    </div>
                  )}

                  {/* Reason */}
                  {winner.reason && (
                    <Typography variant="bodySmall" color="body2" className="line-clamp-2 italic w-full">
                      "{winner.reason}"
                    </Typography>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <Trophy className="size-12 mx-auto mb-4 text-gray-300" />
            <Typography variant="bodyMedium">No winners yet</Typography>
            <Typography variant="bodySmall" color="body2" className="mt-1">
              Winners will appear here once programs are completed.
            </Typography>
          </div>
        )}
      </div>
    </div>
  );

  if (!isDesktop) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        <HeaderBar title="Hall of Fame" />
        <main className="p-4 flex-grow overflow-y-auto">{content}</main>
      </div>
    );
  }

  return (
    <DesktopLayoutWrapper title="Hall of Fame">
      <div className="p-4 md:p-6 overflow-y-auto h-full">{content}</div>
    </DesktopLayoutWrapper>
  );
};

export default HallOfFamePage;
