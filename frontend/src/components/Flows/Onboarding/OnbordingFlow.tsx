import { memo, useCallback, useMemo, useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import {
  ONBOARDING_TABS,
} from "./components/constants";
import DocumentsSection from "./components/DocumentsSection";
import KeyPeopleCard from "./components/KeyPeopleCard";
import ManagerCard from "./components/ManagerCard";
import NavigationTabs from "../../NavigationTab";
import PageHeader from "./components/PageHeader";
import ProfileCard from "./components/ProfileCard";
import { OnboardingTab } from "./components/types";
import VerificationReportsSection from "./components/VerificationReportsSection";
import WorkflowTasksSection from "./components/WorkflowTasksSection";
import ActivityLog from "../ActivityLog";
import AllReports from "../AllReports";
import TableSkeleton from "../../shared/molecules/Skeletons/TableSkeleton";
import { NoDataFound } from "../../shared/atoms/NoDataFound";
import {
  useOnboardingFunnelActivityDetails,
  useOnboardingFunnelActivityLog,
  useEmployeeOnboardingDetail,
} from "../../../hooks/useOnboardingFlow";
import type { WorkflowStage } from "../../../types/flows";


const OnbordingFlow = memo(() => {
  const [activeTab, setActiveTab] = useState<OnboardingTab>(
    "Onboarding Documents"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [spocOpen, setSpocOpen] = useState(false);
  const [recruiterOpen, setRecruiterOpen] = useState(false);
  const [buddiesOpen, setBuddiesOpen] = useState(false);
  const [teammatesOpen, setTeammatesOpen] = useState(false);
  const { isDesktop } = useScreenSize();

  const normalizedSearchQuery = searchQuery.toLowerCase();

  // ─── API: Fetch onboarding funnel activity details ──────────────────────────
  const {
    data: funnelData,
    isLoading: isFunnelLoading,
    isError: isFunnelError,
  } = useOnboardingFunnelActivityDetails();

  // First data item from the API response
  const firstItem = useMemo(
    () => funnelData?.data?.[0] ?? null,
    [funnelData]
  );

  const onboardingId = useMemo(
    () => firstItem?.workflow_stages?.[0]?.todo?.reference_name ?? null,
    [firstItem]
  );

  const { data: onboardingDetailResponse, isLoading: isOnboardingDetailLoading } = useEmployeeOnboardingDetail(onboardingId);
  const onboardingDetail = onboardingDetailResponse?.data;

  // Workflow tasks from the first data item
  const workflowStages: WorkflowStage[] = useMemo(
    () => firstItem?.workflow_stages ?? [],
    [firstItem]
  );

  // The request_id for fetching the activity log
  const funnelActivityId = firstItem?.request_id ?? "";

  // ─── Activity Log Modal ─────────────────────────────────────────────────────
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showAllReport, setShowAllReport] = useState(false);

  // Fetch activity log only when modal is open
  const {
    data: activityLogData,
    isLoading: isActivityLogLoading,
    isError: isActivityLogError,
  } = useOnboardingFunnelActivityLog(funnelActivityId, showActivityLog);

  const activityLogEntries = useMemo(
    () => activityLogData?.data?.entries ?? [],
    [activityLogData]
  );

  // ─── Filtering ──────────────────────────────────────────────────────────────
  const filteredDocuments = useMemo(() => {
    const rawDocs = onboardingDetail?.onboarding_documents || [];
    return rawDocs.filter((doc) =>
      (doc.form_name || "").toLowerCase().includes(normalizedSearchQuery)
    );
  }, [normalizedSearchQuery, onboardingDetail?.onboarding_documents]);

  const filteredWorkflowTasks = useMemo(
    () =>
      workflowStages.filter((stage) =>
        (stage.trigger_title || "").toLowerCase().includes(normalizedSearchQuery)
      ),
    [normalizedSearchQuery, workflowStages]
  );

  const handleSpocToggle = useCallback(
    () => setSpocOpen((open) => !open),
    []
  );
  const handleRecruiterToggle = useCallback(
    () => setRecruiterOpen((open) => !open),
    []
  );
  const handleBuddiesToggle = useCallback(
    () => setBuddiesOpen((open) => !open),
    []
  );
  const handleTeammatesToggle = useCallback(
    () => setTeammatesOpen((open) => !open),
    []
  );

  return (
   
      <div className="w-full min-w-0 min-h-screen overflow-x-hidden bg-slate-50/50 p-2 sm:p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader setShowActivityLog={setShowActivityLog} />

        <ActivityLog
          show={showActivityLog}
          setShowActivityLog={setShowActivityLog}
          entries={activityLogEntries}
          isLoading={isActivityLogLoading}
          isError={isActivityLogError}
        />
        <AllReports show={showAllReport} setShowAllReport={setShowAllReport} />

        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="min-w-0 lg:col-span-2 space-y-4 md:space-y-6">
            <ProfileCard header={onboardingDetail?.header} />

            <div className="min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-5 md:space-y-6">
              <NavigationTabs
                tabs={ONBOARDING_TABS.map((tab: OnboardingTab) => ({ key: tab, label: tab }))}
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab as OnboardingTab)}
              />

              {activeTab === "Onboarding Documents" && (
                <DocumentsSection
                  documents={filteredDocuments}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  isDesktop={isDesktop}
                  onboardingId={onboardingId || ""}
                />
              )}

              {activeTab === "Workflow Tasks" && (
                <>
                  {isFunnelLoading && (
                    <TableSkeleton columns={5} rows={4} />
                  )}

                  {isFunnelError && !isFunnelLoading && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="text-red-500 mb-3">
                        <svg className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-slate-500 text-sm">Failed to load workflow tasks.</p>
                    </div>
                  )}

                  {!isFunnelLoading && !isFunnelError && workflowStages.length === 0 && (
                    <NoDataFound
                      title="No Workflow Tasks"
                      subtitle="There are no workflow tasks for this onboarding."
                    />
                  )}

                  {!isFunnelLoading && !isFunnelError && workflowStages.length > 0 && (
                    <WorkflowTasksSection
                      tasks={filteredWorkflowTasks}
                      searchQuery={searchQuery}
                      onSearchChange={setSearchQuery}
                      isDesktop={isDesktop}
                    />
                  )}
                </>
              )}

              {activeTab === "Verification Reports" && (
                <VerificationReportsSection setShowAllReport={setShowAllReport} />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] pb-6">
            <div className="shrink-0">
              <ManagerCard manager={onboardingDetail?.manager} isLoading={isFunnelLoading || isOnboardingDetailLoading} />
            </div>
            <div className="flex-1 flex flex-col min-h-0">
              <KeyPeopleCard
                keyPeople={onboardingDetail?.key_people}
                isLoading={isFunnelLoading || isOnboardingDetailLoading}
                spocOpen={spocOpen}
                recruiterOpen={recruiterOpen}
                buddiesOpen={buddiesOpen}
                teammatesOpen={teammatesOpen}
                onSpocToggle={handleSpocToggle}
                onRecruiterToggle={handleRecruiterToggle}
                onBuddiesToggle={handleBuddiesToggle}
                onTeammatesToggle={handleTeammatesToggle}
              />
            </div>
          </div>
        </div>
      </div>
  );
});

export default OnbordingFlow;
