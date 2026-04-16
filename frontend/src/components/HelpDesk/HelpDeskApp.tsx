import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, UserLock } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useCurrentUser, isAdminUser } from "../../hooks/useCurrentUser";
import { useGetTicketStats } from "../../hooks/useHelpDeskTickets";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import HelpDeskEmptyState from "./HelpDeskEmptyState";
import HelpDeskSkeleton from "./HelpDeskSkeleton";
import TicketListView from "./TicketListView";
import RequestIssueModal from "./RequestIssueModal";

type ViewMode = "user" | "admin";

const HelpDeskApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const { data: currentUser, isLoading: currentUserLoading } = useCurrentUser();

  // Calculate admin status from user roles
  const isAdmin = isAdminUser(currentUser ?? null);
  const currentUserEmail = currentUser?.email || "";

  // Always show user's own tickets (raised by them)
  const viewMode: ViewMode = "user";

  // View configuration - always show tickets raised by current user
  const viewConfig = {
    title: "Help Desk",
    subtitle: "Issues raised by you",
    filterMode: "raised" as const,
  };


  const { data: stats, refetch: refetchStats, isLoading: statsLoading } = useGetTicketStats();


  // Modal state
  const [isRequestIssueModalOpen, setIsRequestIssueModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const hasTickets = stats && stats.all_issues > 0;
  const canRedirectToDesk = currentUser?.roles?.some((role) =>
    ["Agent", "Agent Manager"].includes(role.role),
  );

  const handleExploreFAQs = () => {
    navigate("/webapp/helpdesk/faq");
  };

  const handleRequestIssue = () => {
    setIsRequestIssueModalOpen(true);
  };

  const handleRequestIssueSuccess = () => {
    // Refetch stats to update the ticket count
    refetchStats();
  };

  const renderContent = () => {
    if (statsLoading || currentUserLoading) {
      return <HelpDeskSkeleton />;
    }
    if (hasTickets) {
      return (
        <div className="p-4 md:p-6">
          <TicketListView
            currentUserEmail={currentUserEmail}
            currentUserLoading={currentUserLoading}
            isAdmin={isAdmin}
            viewMode={viewMode}
            onDrawerStateChange={setIsDrawerOpen}
          />
        </div>
      );
    }
    return <HelpDeskEmptyState />;
  };

  const mobileLayout = (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <HeaderBar title="Help Desk" onBack={() => navigate("/webapp")} />
      </header>

      <div className="px-4 py-3 border-b border-gray-200">
        {statsLoading || currentUserLoading ? (
          <div className="h-4 w-36 bg-gray-200 rounded-md animate-pulse" />
        ) : (
          <Typography variant="bodySmall" color="body2">
            {viewConfig.subtitle}
          </Typography>
        )}
      </div>

      <main className="flex-1 overflow-y-auto bg-app pb-24">
        {renderContent()}
      </main>

      {/* Fixed bottom buttons - hidden when drawer is open */}
      {!isDrawerOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-end gap-3 p-4 bg-white pointer-events-none">
          <Button
            variant="outline"
            bgColor="primary"
            size="lg"
            onClick={handleExploreFAQs}
            className="pointer-events-auto w-full"
          >
            Explore FAQ's
          </Button>
          <Button
            variant="contain"
            bgColor="primary"
            size="lg"
            onClick={handleRequestIssue}
            className="pointer-events-auto w-full"
          >
            <Plus className="w-4 h-4" />
            Request Issue
          </Button>
        </div>
      )}
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title={viewConfig.title}>
      <div className="flex flex-col h-full bg-white rounded-lg">
        {/* Subtitle */}
        <div className="flex justify-between items-center w-full px-8 py-2 border-b border-gray-200">
          {statsLoading || currentUserLoading ? (
            <div className="h-4 w-36 bg-gray-200 rounded-md animate-pulse" />
          ) : (
            <Typography variant="bodySmall" color="body2">
              {viewConfig.subtitle}
            </Typography>
          )}

          {!statsLoading && !currentUserLoading && isDesktop && canRedirectToDesk && (
            <a href="/helpdesk/tickets" target="_blank" rel="noopener noreferrer">
              <Button size="md">
                <UserLock size={18} />
                Switch to agent view
              </Button>
            </a>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-app pb-24">
          {renderContent()}
        </div>

        {/* Fixed bottom buttons - hidden when drawer is open */}
        {!isDrawerOpen && (
          <div className="fixed bottom-0 right-0 z-50 flex justify-end gap-3 p-4  pointer-events-none">
            <Button
              variant="outline"
              bgColor="primary"
              size="lg"
              onClick={handleExploreFAQs}
              className="pointer-events-auto bg-white"
            >
              Explore FAQ's
            </Button>
            <Button
              variant="contain"
              bgColor="primary"
              size="lg"
              onClick={handleRequestIssue}
              className="pointer-events-auto"
            >
              <Plus className="w-4 h-4" />
              Request Issue
            </Button>
          </div>
        )}
      </div>
    </DesktopLayoutWrapper>
  );

  return (
    <>
      {isDesktop ? desktopLayout : mobileLayout}

      {/* Request Issue Modal */}
      <RequestIssueModal
        isOpen={isRequestIssueModalOpen}
        onClose={() => setIsRequestIssueModalOpen(false)}
        onSuccess={handleRequestIssueSuccess}
      />
    </>
  );
};

export default HelpDeskApp;
