import { memo, Suspense, useCallback, useMemo, useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import {
  DOCUMENT_DATA,
  ONBOARDING_TABS,
  WORKFLOW_TASKS,
} from "./components/constants";
import DocumentsSection from "./components/DocumentsSection";
import KeyPeopleCard from "./components/KeyPeopleCard";
import ManagerCard from "./components/ManagerCard";
import OnboardingTabs from "./components/OnboardingTabs";
import PageHeader from "./components/PageHeader";
import ProfileCard from "./components/ProfileCard";
import { OnboardingTab } from "./components/types";
import VerificationReportsSection from "./components/VerificationReportsSection";
import WorkflowTasksSection from "./components/WorkflowTasksSection";

const SectionFallback = memo(() => null);

const OnbordingFlow = memo(() => {
  const [activeTab, setActiveTab] = useState<OnboardingTab>(
    "Onboarding Documents"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [spocOpen, setSpocOpen] = useState(true);
  const [recruiterOpen, setRecruiterOpen] = useState(true);
  const [buddiesOpen, setBuddiesOpen] = useState(true);
  const { isDesktop } = useScreenSize();

  const normalizedSearchQuery = searchQuery.toLowerCase();

  const filteredDocuments = useMemo(
    () =>
      DOCUMENT_DATA.filter((doc) =>
        doc.name.toLowerCase().includes(normalizedSearchQuery)
      ),
    [normalizedSearchQuery]
  );

  const filteredWorkflowTasks = useMemo(
    () =>
      WORKFLOW_TASKS.filter((task) =>
        task.name.toLowerCase().includes(normalizedSearchQuery)
      ),
    [normalizedSearchQuery]
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

  return (
    <Suspense fallback={<SectionFallback />}>
      <div className="w-full min-w-0 min-h-screen overflow-x-hidden bg-slate-50/50 p-2 sm:p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader />

        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="min-w-0 lg:col-span-2 space-y-4 md:space-y-6">
            <ProfileCard />

            <div className="min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-5 md:space-y-6">
              <OnboardingTabs
                tabs={ONBOARDING_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />

              {activeTab === "Onboarding Documents" && (
                <DocumentsSection
                  documents={filteredDocuments}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  isDesktop={isDesktop}
                />
              )}

              {activeTab === "Workflow Tasks" && (
                <WorkflowTasksSection
                  tasks={filteredWorkflowTasks}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  isDesktop={isDesktop}
                />
              )}

              {activeTab === "Verification Reports" && (
                <VerificationReportsSection />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <ManagerCard />
            <KeyPeopleCard
              spocOpen={spocOpen}
              recruiterOpen={recruiterOpen}
              buddiesOpen={buddiesOpen}
              onSpocToggle={handleSpocToggle}
              onRecruiterToggle={handleRecruiterToggle}
              onBuddiesToggle={handleBuddiesToggle}
            />
          </div>
        </div>
      </div>
    </Suspense>
  );
});

export default OnbordingFlow;
