import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetRecognitionPrograms } from "../../services/recognitionService";
import { useGetRecognitionLeaderboard } from "../../services/recognitionService";
import { useGetRecognitionMetrics } from "../../services/recognitionService";
import { useGetDepartmentNominationStatus } from "../../services/recognitionService";
import { useGetLastProgramWinners } from "../../services/recognitionService";
import { useGetEmployeeRecognitionPoints } from "../../services/recognitionService";
import { useGetMyRecognitionActivity } from "../../services/recognitionService";
import { LastProgramWinners } from "./LastProgramWinners";
import { MyActivitySection } from "./MyActivitySection";
import { ActivePrograms } from "./ActivePrograms";
import { OngoingPrograms } from "./OngoingPrograms";
import { Leaderboard } from "./Leaderboard";
import { RecognitionMetrics } from "./RecognitionMetrics";
import { DepartmentStatus } from "./DepartmentStatus";
import { AppreciateEmployeeModal } from "./AppreciateEmployeeModal";
import { Typography } from "../shared/atoms/Typography";
import Button from "../shared/atoms/Button";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import { useScreenSize } from "../../hooks/useScreenSize";
import { Plus } from "lucide-react";

const RecognitionPage: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const [showAppreciateModal, setShowAppreciateModal] = useState(false);

  // Fetch all data
  const { data: programsData, isLoading: programsLoading } =
    useGetRecognitionPrograms();
  const { data: leaderboardReceived, isLoading: leaderboardLoading } =
    useGetRecognitionLeaderboard(undefined, "received");
  const { data: leaderboardGiven } = useGetRecognitionLeaderboard(
    undefined,
    "given"
  );
  const { data: metricsData, isLoading: metricsLoading } =
    useGetRecognitionMetrics();
  const {
    data: departmentData,
    isLoading: departmentLoading,
  } = useGetDepartmentNominationStatus();
  const { data: winnersData, isLoading: winnersLoading } =
    useGetLastProgramWinners(3);
  const { data: pointsData, isLoading: pointsLoading } =
    useGetEmployeeRecognitionPoints();
  const { data: myActivityData, isLoading: myActivityLoading } =
    useGetMyRecognitionActivity();

  const handleAppreciate = () => {
    setShowAppreciateModal(true);
  };

  const handleModalClose = () => {
    setShowAppreciateModal(false);
  };

  const dashboardContent = (
    <div className="bg-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with My Points and Appreciate Button */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <Typography variant="h1" className="text-2xl md:text-3xl font-bold mb-2">
              Recognition
            </Typography>
            <Typography variant="bodyMedium" color="body2">
              Recognise your colleagues' achievements and track your team's
              success.
            </Typography>
          </div>
          {!pointsLoading && (
            <div className="flex items-center gap-2">
              <Typography variant="bodyMedium" className="text-primary font-semibold">
                My Points: {pointsData?.points || 0}
              </Typography>
            </div>
          )}
        </div>

        {/* My Activity */}
        <MyActivitySection
          activity={myActivityData}
          isLoading={myActivityLoading}
        />

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Last Program Winners */}
            <LastProgramWinners
              winners={winnersData?.winners || []}
              isLoading={winnersLoading}
            />

            {/* Active Programs */}
            <ActivePrograms
              programs={programsData?.active_programs || []}
              isLoading={programsLoading}
            />

            {/* Ongoing Programs */}
            <OngoingPrograms
              programs={programsData?.ongoing_programs || []}
              isLoading={programsLoading}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Leaderboard */}
            <Leaderboard
              received={leaderboardReceived?.leaderboard || []}
              given={leaderboardGiven?.leaderboard || []}
              isLoading={leaderboardLoading}
            />
          </div>
        </div>

        {/* Bottom Row - Full Width */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recognition Metrics */}
          <RecognitionMetrics
            metrics={metricsData?.metrics || {
              chart_data: [],
              eligible_to_give: { percentage: 0, change: 0, change_type: "increase" },
              avg_recognition: 0,
              total_recognitions: 0,
              year: new Date().getFullYear(),
            }}
            isLoading={metricsLoading}
          />

          {/* Department Status */}
          <DepartmentStatus
            overallApprovalPercentage={
              departmentData?.overall_approval_percentage || 0
            }
            totalPending={departmentData?.total_pending || 0}
            departments={departmentData?.departments || []}
            isLoading={departmentLoading}
          />
        </div>
      </div>
    </div>
  );

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <HeaderBar title="Recognition" onBack={() => navigate(-1)} />
      <main className="p-4 z-100 flex-grow overflow-y-auto">
        {dashboardContent}
      </main>
      {/* Appreciate Employee Modal */}
      <AppreciateEmployeeModal
        isOpen={showAppreciateModal}
        onClose={handleModalClose}
      />
    </div>
  );

  const appreciateButton = (
    <Button
      size="md"
      bgColor="primary"
      onClick={handleAppreciate}
      icon={<Plus className="size-4" />}
    >
      Appreciate
    </Button>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title="Recognition" actionButton={appreciateButton}>
      <div className="p-4 md:p-6 overflow-y-auto h-full">
        {dashboardContent}
      </div>
      {/* Appreciate Employee Modal */}
      <AppreciateEmployeeModal
        isOpen={showAppreciateModal}
        onClose={handleModalClose}
      />
    </DesktopLayoutWrapper>
  );

  return isDesktop ? desktopLayout : mobileLayout;
};

export default RecognitionPage;
