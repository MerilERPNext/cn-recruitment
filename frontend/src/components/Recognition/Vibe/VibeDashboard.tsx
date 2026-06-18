import React from "react";
import { Typography } from "../../shared/atoms/Typography";
import {
  useGetRecognitionPrograms,
  useGetRecognitionLeaderboard,
  useGetRecognitionMetrics,
  useGetDepartmentNominationStatus,
  useGetLastProgramWinners,
  useGetMyRecognitionActivity,
} from "../../../services/recognitionService";
import { LastProgramWinners } from "../LastProgramWinners";
import { MyActivitySection } from "../MyActivitySection";
import { ActivePrograms } from "../ActivePrograms";
import { OngoingPrograms } from "../OngoingPrograms";
import { Leaderboard } from "../Leaderboard";
import { RecognitionMetrics } from "../RecognitionMetrics";
import { DepartmentStatus } from "../DepartmentStatus";

/**
 * Surfaces the existing (already-built) recognition dashboard widgets inside the
 * Vibe sub-section layout. Mirrors RecognitionPage's dashboard content but
 * without the page-level layout wrapper, so it can live inside a Vibe tab.
 */
const VibeDashboard: React.FC = () => {
  const { data: programsData, isLoading: programsLoading } = useGetRecognitionPrograms();
  const { data: leaderboardReceived, isLoading: leaderboardLoading } =
    useGetRecognitionLeaderboard(undefined, "received");
  const { data: leaderboardGiven } = useGetRecognitionLeaderboard(undefined, "given");
  const { data: metricsData, isLoading: metricsLoading } = useGetRecognitionMetrics();
  const { data: departmentData, isLoading: departmentLoading } =
    useGetDepartmentNominationStatus();
  const { data: winnersData, isLoading: winnersLoading } = useGetLastProgramWinners(3);
  const { data: myActivityData, isLoading: myActivityLoading } =
    useGetMyRecognitionActivity();

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Typography variant="h2" className="text-xl md:text-2xl font-bold mb-1">
            Dashboard
          </Typography>
          <Typography variant="bodyMedium" color="body2">
            Recognise your colleagues' achievements and track your team's success.
          </Typography>
        </div>

        <MyActivitySection activity={myActivityData} isLoading={myActivityLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4 md:space-y-6">
            <LastProgramWinners
              winners={winnersData?.winners || []}
              isLoading={winnersLoading}
            />
            <ActivePrograms
              programs={programsData?.active_programs || []}
              isLoading={programsLoading}
            />
            <OngoingPrograms
              programs={programsData?.ongoing_programs || []}
              isLoading={programsLoading}
            />
          </div>
          <div className="space-y-4 md:space-y-6">
            <Leaderboard
              received={leaderboardReceived?.leaderboard || []}
              given={leaderboardGiven?.leaderboard || []}
              isLoading={leaderboardLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <RecognitionMetrics
            metrics={
              metricsData?.metrics || {
                chart_data: [],
                eligible_to_give: { percentage: 0, change: 0, change_type: "increase" },
                avg_recognition: 0,
                total_recognitions: 0,
                year: new Date().getFullYear(),
              }
            }
            isLoading={metricsLoading}
          />
          <DepartmentStatus
            overallApprovalPercentage={departmentData?.overall_approval_percentage || 0}
            totalPending={departmentData?.total_pending || 0}
            departments={departmentData?.departments || []}
            isLoading={departmentLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default VibeDashboard;
