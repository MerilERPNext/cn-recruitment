import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useScreenSize } from "../../hooks/useScreenSize";
import { useCurrentUser, isAdminUser } from "../../hooks/useCurrentUser";
import { useTicketStats } from "../../hooks/useHelpDeskTickets";
import DesktopLayoutWrapper from "../DesktopLayoutWrapper";
import HeaderBar from "../HeaderBar";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import HelpDeskEmptyState from "./HelpDeskEmptyState";
import TicketListView from "./TicketListView";
import RequestIssueModal from "./RequestIssueModal";

type ViewMode = "user" | "admin";

const HelpDeskApp: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();

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

  // Pass user context to useTicketStats for role-based filtering
  const { data: stats, refetch: refetchStats } = useTicketStats(
    currentUserEmail,
    isAdmin,
    viewMode
  );

  // Modal state
  const [isRequestIssueModalOpen, setIsRequestIssueModalOpen] = useState(false);

  const hasTickets = stats && stats.total > 0;

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
    if (hasTickets) {
      return (
        <div className="p-4 md:p-6">
          <TicketListView
            currentUserEmail={currentUserEmail}
            isAdmin={isAdmin}
            viewMode={viewMode}
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
        <Typography variant="bodySmall" color="body2">
          {viewConfig.subtitle}
        </Typography>
      </div>

      <main className="flex-1 overflow-y-auto bg-app">
        {renderContent()}
      </main>

      {/* Fixed bottom buttons - OUTSIDE main scroll area */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 py-4 px-4 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <Button
          variant="outline"
          bgColor="primary"
          size="lg"
          fullWidth
          onClick={handleExploreFAQs}
        >
          Explore FAQ's
        </Button>
        <Button
          variant="contain"
          bgColor="primary"
          size="lg"
          fullWidth
          onClick={handleRequestIssue}
        >
          <Plus className="w-4 h-4" />
          Request Issue
        </Button>
      </div>
    </div>
  );

  const desktopLayout = (
    <DesktopLayoutWrapper title={viewConfig.title}>
      <div className="flex flex-col h-full bg-white rounded-lg">
        {/* Subtitle */}
        <div className="px-8 py-4 border-b border-gray-200">
          <Typography variant="bodySmall" color="body2">
            {viewConfig.subtitle}
          </Typography>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-app">
          {renderContent()}
        </div>

        {/* Fixed bottom buttons - OUTSIDE scroll area */}
        <div className="sticky bottom-0 bg-white flex justify-end gap-3 px-6 py-4 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <Button
            variant="outline"
            bgColor="primary"
            size="lg"
            onClick={handleExploreFAQs}
          >
            Explore FAQ's
          </Button>
          <Button
            variant="contain"
            bgColor="primary"
            size="lg"
            onClick={handleRequestIssue}
          >
            <Plus className="w-4 h-4" />
            Request Issue
          </Button>
        </div>
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
